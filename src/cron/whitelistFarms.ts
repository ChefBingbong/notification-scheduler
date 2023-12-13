import { ChainId } from "@pancakeswap/chains";
import axios from "axios";
import { Address } from "viem";
// import loadB
import { poolV3Abi } from "../blockchain/abi/PoolV3Abi";
import { PANCAKESWAP_V3_API } from "../blockchain/constants";
import appConfig from "../config/config";
import { tickeRanges } from "../graph";
import { redisClient } from "../index";
import { SharedCronTask } from "./sharedCronTask";
import { loadBalancer } from "./utils/loadBalancerBatcher";

export class WhitelistFarmsNotifyTask extends SharedCronTask {
  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super(jobId, schedule, supportedChains);
    supportedChains.forEach((chain) =>
      loadBalancer.initializeInstance<Address>(`${this.job.jobName}-${chain}`, ["0x"], 120)
    );
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getFormattedSubscribers();
    this.executeCronTask(chainId, subscribers, this.getClient(chainId));
  }

  protected async mainFunction(networkId: ChainId, users: Address[]): Promise<void> {
    try {
      const response = await axios.get(`${PANCAKESWAP_V3_API}/${networkId}/farms`);
      const body = JSON.parse(JSON.stringify(response.data));
      const lpSymbolMap: { [pool: string]: string } = {};

      const farms: Address[] = body.farmsWithPrice.map((farm: { lpAddress: Address; lpSymbol: string }) => {
        lpSymbolMap[farm.lpAddress.toLowerCase()] = farm.lpSymbol;
        return farm.lpAddress.toLowerCase();
      });
      await this.storePoolTickRanges(networkId, farms);
      loadBalancer.setUpdateactiveSubscribers<Address>(`${this.job.jobName}-${networkId}`, farms);

      await redisClient.setPoolLpSymbol(networkId, lpSymbolMap);
      await redisClient.storeWhitelistedFarms(networkId, {
        pools: farms,
        lastUpdateTimestamp: new Date().getTime() / 1000,
      });
    } catch (error) {
      this.job.log.error(`Failed to fetch WhiteListedFarms. networkId: ${networkId}`, error.message);
    }
  }

  private async getPoolTick(networkId: ChainId, poolAddresses: Address[]): Promise<(number | null)[]> {
    const client = this.getClient(networkId);
    const responses = await client.multicall({
      contracts: poolAddresses.map((poolAddress) => ({
        address: poolAddress,
        abi: poolV3Abi,
        functionName: "slot0",
      })),
    });

    return responses.map((response) => (response.result ? (response.result.at(1) as number) : null));
  }

  private async storePoolTickRanges(networkId: ChainId, farms: Address[]) {
    const ticks = await this.getPoolTick(networkId, farms);
    const batchPositionsTickRanges: tickeRanges = {
      tickUpper: [],
      tickLower: [],
    };
    farms.forEach((poolId, index) => {
      if (ticks[index] !== null) {
        batchPositionsTickRanges.tickLower.push({ poolId, tick: ticks[index], tickRangeOut: "tickLower" });
        batchPositionsTickRanges.tickUpper.push({ poolId, tick: ticks[index], tickRangeOut: "tickUpper" });
      }
    });
    await redisClient.setPoolTicks(networkId, batchPositionsTickRanges);
  }
}

export const whiteListFarmsCheck = new WhitelistFarmsNotifyTask(
  `whitelist-farms-cronTask`,
  appConfig.whitelistFarmsSchedule,
  [ChainId.BSC, ChainId.ETHEREUM]
);
