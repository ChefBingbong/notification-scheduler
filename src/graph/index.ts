import { ChainId } from "@pancakeswap/chains";
import { SupportedChain } from "../blockchain/chains";
import { UserPosition } from "../model/graphData";
import { BatchPools } from "./userFarmPositions/getBatchUserPositionOutOfRange";

export const getGraphUrl = (networkId: number) => {
  let graphUrl = "https://api.thegraph.com/subgraphs/name/pancakeswap/user-positions-v3-eth";
  switch (networkId) {
    case 1:
      graphUrl = "https://api.thegraph.com/subgraphs/name/pancakeswap/user-positions-v3-eth";
      break;
    case 56:
      graphUrl = "https://api.thegraph.com/subgraphs/name/pancakeswap/user-positions-v3-bsc";
      break;
    case 5:
      graphUrl = "https://api.thegraph.com/subgraphs/name/chefbingbong/user-position-v3-goerli";
      break;
    case 97:
      graphUrl = "https://api.thegraph.com/subgraphs/name/chefbingbong/user-position-v3-chapel";
      break;
  }
  return graphUrl;
};

export const V3_SUBGRAPHS: { [chain in SupportedChain & ChainId.POLYGON_ZKEVM]: string } = {
  [ChainId.ETHEREUM]: "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-eth",
  [ChainId.GOERLI]: "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-goerli",
  [ChainId.BSC]: `https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc`,
  [ChainId.BSC_TESTNET]: "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-chapel",
  [ChainId.ARBITRUM_ONE]: "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-arb",
  [ChainId.POLYGON_ZKEVM]: "https://api.studio.thegraph.com/query/45376/exchange-v3-polygon-zkevm/v0.0.0",
  [ChainId.ZKSYNC]: "https://api.studio.thegraph.com/query/45376/exchange-v3-zksync/version/latest",
  [ChainId.LINEA]: "https://graph-query.linea.build/subgraphs/name/pancakeswap/exchange-v3-linea",
  [ChainId.BASE]: "https://api.studio.thegraph.com/query/45376/exchange-v3-base/version/latest",
  [ChainId.OPBNB]: "https://opbnb-mainnet-graph.nodereal.io/subgraphs/name/pancakeswap/exchange-v3",
};

export interface UserPositionsResponse {
  userPositions: UserPosition[];
}

export interface LotteryTicket {
  id: string;
  number: string;
  status: boolean;
  rewardBracket?: number;
  roundId?: string;
  cakeReward?: string;
}

export interface UserGQLRoundData {
  lottery: {
    id: string;
    endTime: string;
    status: string;
  };
  claimed: string;
  totalTickets: string;
}

export interface UserFlattenedRoundData {
  lotteryId: string;
  endTime: string;
  status: string;
  claimed: string;
  totalTickets: string;
}

export interface UserLotteryData<T> {
  account: string;
  totalCake: string;
  totalTickets: string;
  rounds: T[];
}

type WhereClause = Record<string, string | number | boolean | string[]>;

export interface GetPredictionUsersOptions {
  skip?: number;
  first?: number;
  orderBy?: string;
  orderDir?: string;
  where?: WhereClause;
}
export interface UserResponse<BetType> {
  id: string;
  createdAt: string;
  updatedAt: string;
  block: string;
  totalBets: string;
  totalBetsBull: string;
  totalBetsBear: string;
  totalBetsClaimed: string;
  winRate: string;
  averageBNB: string;
  bets?: BetType[];
}

export interface BetResponse {
  id: string;
  hash: string;
  amount: string;
  position: string;
  claimed: boolean;
  claimedAt: string;
  claimedBlock: string;
  claimedHash: string;
  createdAt: string;
  updatedAt: string;
  block: string;
}

type Round = {
  id: string;
  epoch: string;
  position: string;
  failed: boolean;
  startAt: string;
  startBlock: string;
  startHash: string;
  lockAt: string;
  lockBlock: string;
  lockHash: string;
  lockPrice: string;
  lockRoundId: string;
  closeAt: string;
  closeBlock: string;
  closeHash: string;
  closePrice: string;
  closeRoundId: string;
  totalBets: string;
  totalAmount: string;
  bullBets: string;
  bullAmount: string;
  bearBets: string;
  bearAmount: string;
};

type Bet = {
  id: string;
  hash: string;
  amount: string;
  position: string;
  claimed: boolean;
  claimedAt: string;
  claimedHash: string;
  claimedBlock: string;
  claimedCAKE: string;
  claimedNetCAKE: string;
  createdAt: string;
  updatedAt: string;
  round: Round;
};

export type UserRound = {
  id: string;
  createdAt: string;
  updatedAt: string;
  block: string;
  totalBets: string;
  totalBetsBull: string;
  totalBetsBear: string;
  totalCAKE: string;
  totalCAKEBull: string;
  totalCAKEBear: string;
  totalBetsClaimed: string;
  totalCAKEClaimed: string;
  winRate: string;
  averageCAKE: string;
  netCAKE: string;
  bets: Bet[];
};

export type PredictionUsersResponse = {
  users: UserRound[];
};

type User = {
  id: string;
};

type RoundsBet = {
  id: string;
  user: User;
  amount: string;
  claimed: boolean;
};

export type PredictionRound = {
  id: string;
  epoch: string;
  startAt: string;
  closeAt: string;
  bets: RoundsBet[];
};

export type PredictionRoundsData = {
  rounds: PredictionRound[];
};

export interface WhitelistedFarms {
  pools: string[];
  lastUpdateTimestamp: number;
}

export interface UsePoolAvgInfoParams {
  chainId: ChainId;
  numberOfDays?: number;
  addresses?: string[];
}

export interface Info {
  id: string;
  tvlUSD: string;
  feesUSD: string;
  protocolFeesUSD: string;
}

export enum RewardType {
  CAKE_STAKERS = "rb",
  TOP_TRADERS = "tt",
}

export interface CampaignVolume {
  pool: string;
  volume: number;
  estimateRewardUSD: number;
  tradingFee: string;
  maxCap: number;
  chainId: ChainId;
}

export interface CampaignIdInfoResponse {
  total: number;
  tradingFeeArr: CampaignVolume[];
}

export interface UserCampaignInfoResponse {
  id: string;
  isActive: boolean;
  lockEndTime: number;
  lockStartTime: number;
  lockedAmount: number;
  createdAt: string;
  isQualified: boolean;
  thresholdLockedPeriod: number;
  thresholdLockedAmount: string;
  needsProfileActivated: boolean;
}

export interface ClaimTimeDetails {
  campaignClaimTime: number;
  campaignClaimEndTime: number;
  isActivated: boolean;
  thresholdLockTime: number;
}
export interface UserCampaignInfoDetail extends UserCampaignInfoResponse, ClaimTimeDetails {
  campaignId: string;
  userClaimedIncentives: boolean;
  totalEstimateRewardUSD: number;
}

export interface UseAllUserCampaignInfoProps {
  campaignId: string;
  type: RewardType;
}

export type tickeRanges = {
  tickUpper: BatchPools[];
  tickLower: BatchPools[];
};
