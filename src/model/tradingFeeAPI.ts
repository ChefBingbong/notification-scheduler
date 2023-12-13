export interface CampaignIdsApiResponse {
  code: number;
  data: string[];
}

export interface Trader {
  tradingFee: number;
  volume: number;
  origin: string;
  estimateRewardUSD: number;
  rank: number;
}

export interface RankListApiResponse {
  code: number;
  data: {
    topTradersArr: Trader[];
  };
}
