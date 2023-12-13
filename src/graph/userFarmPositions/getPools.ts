import request, { gql } from "graphql-request";
import { Pool } from "../../model/graphData";
import { getGraphUrl } from "..";
import { poolV3Abi } from "../../blockchain/abi/PoolV3Abi";
import { getViemClient, viemAddress } from "../../blockchain/client";
import { ChainId } from "@pancakeswap/chains";

export const getPoolsNextPages = async (networkId: number, lastTimeStamp?: number): Promise<Pool[]> => {
  const lastTimeStampQuery = (lastTimeStamp && " createdAtTimestamp_gte:  $lastTimeStamp ") || "";
  const url = getGraphUrl(networkId);
  let pools: Pool[] = [];
  try {
    await request<{ pools: Pool[] }>(
      url,
      gql`
          query getPoolsQuery($lastTimeStamp: Int) {
              pools(
                  first: 1000
                  orderBy: createdAtTimestamp
                  orderDirection: asc
                  where: ${"{" + lastTimeStampQuery + "}"}
              ) {
                  id
                  createdAtTimestamp
                  createdAtBlockNumber
                  token0 {id, name, decimals}
                  token1 {id, name, decimals}
              }
          }
      `,
      { lastTimeStamp }
    ).then((res) => {
      pools = res.pools;
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
  }

  return pools;
};

export const createPoolQueryName = (pool: string, tick: number) => {
  if (tick < 0) {
    return `pool${pool}tickminus${tick * -1}`;
  }
  return `pool${pool}tick${tick}`;
};
