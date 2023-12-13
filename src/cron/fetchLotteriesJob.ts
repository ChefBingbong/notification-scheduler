import { ChainId } from "@pancakeswap/chains";
import { Address, PublicClient, getAddress } from "viem";
import appConfig from "../config/config";
import { getCurrentLotteryEntity, getLotteryInformation } from "../graph/lotteryPositions/getUpComingLotteryData";
import { fetchUserTicketsForOneRound, getLotteryPrizeInCake } from "../graph/lotteryPositions/getUserTicketInfo";
import { redisClient, service } from "../index";
import { UserFlattenedRoundData } from "../model/graphData";
import {
  BuilderNames,
  getLotteryNotificationBody1,
  getLotteryNotificationBody3,
  sendPushNotification,
} from "../util/pushUtils";
import { getFormattedTime } from "../util/timeCalculator";
import { formatDollarNumber } from "../util/utils";
import { SharedCronTask } from "./sharedCronTask";

export class LotteryFetchNewPlayersTask extends SharedCronTask {
  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super(jobId, schedule, supportedChains);
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getFormattedSubscribers();
    this.executeCronTask(chainId, subscribers, this.getClient(chainId));
  }

  protected async mainFunction(network: ChainId, users: Address[]) {
    try {
      const keysToSet: string[] = [];
      const { currentLottery, existingLotteryPlayers } = await getLotteryInformation(users);
      const userTimestampKeys = redisClient.getUserTimestampKeys(network, this.job.jobName, users);
      const existResults = await redisClient.existUserNotificationBatch(userTimestampKeys);

      let usersDueForNotification: Address[] = [];
      for (let userIndex = 0; userIndex < users.length; userIndex++) {
        const user = users[userIndex];
        if (existResults[userIndex]) continue;

        keysToSet.push(userTimestampKeys[userIndex]);
        usersDueForNotification.push(user);
      }

      for (const existingUser of existingLotteryPlayers) {
        const isUserEntered = existingUser.rounds.some(
          (round: UserFlattenedRoundData) => round.lotteryId === currentLottery.id && round.status === "open"
        );
        const account = existingUser.account;
        if (!isUserEntered) continue;
        usersDueForNotification.push(getAddress(account));
      }

      this.buildAndSendNotification(usersDueForNotification, keysToSet);
    } catch (error) {
      console.error("Error fetching Lottery data:", error);
    }
  }

  private async buildAndSendNotification(usersDueForNotification: Address[], keysToSet: string[]) {
    if (usersDueForNotification.length === 0) return;

    const { endTime, id } = await getCurrentLotteryEntity();
    const formattedTimeString = getFormattedTime(Number(endTime));

    const modifiedArray = usersDueForNotification
      .filter((value, index, self) => self.indexOf(value) === index)
      .map((item) => `eip155:1:${item}`);

    const { totalPrizeInUsd, prizeAmountInCake } = await getLotteryPrizeInCake(id, this.getClient(ChainId.BSC));

    const body = getLotteryNotificationBody1([
      formattedTimeString,
      formatDollarNumber(totalPrizeInUsd),
      formatDollarNumber(prizeAmountInCake),
    ]);

    await sendPushNotification(
      BuilderNames.lotteryNotification,
      [modifiedArray, body],
      usersDueForNotification as Address[]
    );

    await redisClient.storeUseNotificationBatch(keysToSet, "lottery notified");
  }
}

export class LotteryNotifyPlayersOnLotteryEndTask extends SharedCronTask {
  constructor(jobId: string, schedule: string, supportedChains: ChainId[]) {
    super(jobId, schedule, supportedChains);
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getFormattedSubscribers();
    this.executeCronTask(chainId, subscribers, this.getClient(chainId));
  }

  protected async mainFunction(network: ChainId, users: Address[], provider: PublicClient) {
    try {
      const { currentLottery, existingLotteryPlayers } = await getLotteryInformation(users, 2);
      if (!(await redisClient.getLotteryRoundNotified(currentLottery.id)) && currentLottery.status === "claimable") {
        const winnersArray: Address[] = [];
        for (const existingUser of existingLotteryPlayers) {
          const isUserEntered = existingUser.rounds.some(
            (round: UserFlattenedRoundData) => round.lotteryId === currentLottery.id && round.status === "claimable"
          );
          if (isUserEntered) {
            const { winningTickets: usersTicketsResults } = await fetchUserTicketsForOneRound(
              existingUser.account,
              currentLottery.id,
              currentLottery.finalNumber,
              provider
            );
            const winningTickets = usersTicketsResults?.filter((ticket) => ticket.status);
            if (winningTickets?.length) winnersArray.push(getAddress(existingUser.account));
          }
        }

        this.buildAndSendNotification(winnersArray, currentLottery.id);
      }
      this.job.cronJob.stop();

      const newSchedule = await this.calculateNewCronSchedule(Number((await getCurrentLotteryEntity()).endTime), 30, 0);
      console.log(this.job.jobName, newSchedule, (await getCurrentLotteryEntity()).id);

      const newJobInstance = new LotteryNotifyPlayersOnLotteryEndTask(`lotteries-result-cron`, newSchedule, [
        ChainId.BSC,
      ]);

      service.initBnbChainJobs([newJobInstance] as any);
    } catch (error) {
      console.error("Error fetching Lottery data:", error);
    }
  }

  private async buildAndSendNotification(winnersArray: Address[], currentLotteryId: string) {
    if (winnersArray.length === 0) return;

    const body = getLotteryNotificationBody3();
    const modifiedArray = winnersArray.map((item) => `eip155:1:${item}`);

    await sendPushNotification(BuilderNames.lotteryNotification, [modifiedArray, body], winnersArray);
    await redisClient.setLotteryRoundNotified(currentLotteryId, true);
  }
}

export const lotteryNotifyCheck = new LotteryFetchNewPlayersTask(
  `lotteries-update-cron`,
  appConfig.lotteryuUpdateSchedule,
  [ChainId.BSC]
);

export const lotteryUpdateCheck = new LotteryNotifyPlayersOnLotteryEndTask(
  `lotteries-result-cron`,
  appConfig.lotteryResultSchedule,
  [ChainId.BSC]
);
