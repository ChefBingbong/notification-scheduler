import { NativeBalanceChecker, nativeBalanceChecker } from "./checkLowNativeBalance";
import { PriceCheckTask, priceCheckTask } from "./compareNativeTokenPrice";
import { FarmsAPRCheckTask, farmsAprCheck } from "./farmsAprJob";
import {
  LotteryFetchNewPlayersTask,
  LotteryNotifyPlayersOnLotteryEndTask,
  lotteryNotifyCheck,
  lotteryUpdateCheck,
} from "./fetchLotteriesJob";
import { GlobalTaskUtils, globalTasksJob } from "./globalCronTaskUtils";
import { WhitelistFarmsNotifyTask, whiteListFarmsCheck } from "./whitelistFarms";
import { UserPositionsNotifyTask, userPositionNotifyCheck } from "./userPositionNotify";
import {
  PredictionOnBoardJob,
  PredictionWinnerJob,
  predictionBnbWinnerCheck,
  predictionCakeWinnerCheck,
  predictionNotifyNewUsersCheck,
} from "./fetchPredictionsJob";

export enum CronJobs {
  NativeBalanceChecker = "NativeBalanceChecker",
  PriceCheckTask = "PriceCheckTask",
  FarmsAPRCheckTask = "FarmsAPRCheckTask",
  LotteryFetchNewPlayersTask = "LotteryFetchNewPlayersTask",
  LotteryNotifyPlayersOnLotteryEndTask = "LotteryNotifyPlayersOnLotteryEndTask",
  PredictionOnBoardJob = "PredictionOnBoardJob",
  PredictionWinnerJobCake = "PredictionWinnerJobCake",
  PredictionWinnerJobBnb = "PredictionWinnerJobBnb",
  UserPositionsNotifyTask = "UserPositionsNotifyTask",
  WhitelistFarmsNotifyTask = "WhitelistFarmsNotifyTask",
  GlobalTaskUtils = "GlobalTaskUtils",
}

export type CronJobKeys =
  | NativeBalanceChecker
  | PriceCheckTask
  | FarmsAPRCheckTask
  | LotteryFetchNewPlayersTask
  | LotteryNotifyPlayersOnLotteryEndTask
  | PredictionOnBoardJob
  | PredictionWinnerJob
  | UserPositionsNotifyTask
  | WhitelistFarmsNotifyTask
  | GlobalTaskUtils;

export interface CronJobsMap {
  [CronJobs.PriceCheckTask]: PriceCheckTask;
  [CronJobs.FarmsAPRCheckTask]: FarmsAPRCheckTask;
  [CronJobs.LotteryFetchNewPlayersTask]: LotteryFetchNewPlayersTask;
  [CronJobs.LotteryNotifyPlayersOnLotteryEndTask]: LotteryNotifyPlayersOnLotteryEndTask;
  [CronJobs.PredictionOnBoardJob]: PredictionOnBoardJob;
  [CronJobs.PredictionWinnerJobCake]: PredictionWinnerJob;
  [CronJobs.PredictionWinnerJobBnb]: PredictionWinnerJob;
  [CronJobs.UserPositionsNotifyTask]: UserPositionsNotifyTask;
  [CronJobs.WhitelistFarmsNotifyTask]: WhitelistFarmsNotifyTask;
  [CronJobs.GlobalTaskUtils]: GlobalTaskUtils;
}

export const AllCronJobs: CronJobsMap = {
  PriceCheckTask: priceCheckTask,
  FarmsAPRCheckTask: farmsAprCheck,
  LotteryFetchNewPlayersTask: lotteryNotifyCheck,
  LotteryNotifyPlayersOnLotteryEndTask: lotteryUpdateCheck,
  PredictionOnBoardJob: predictionNotifyNewUsersCheck,
  PredictionWinnerJobCake: predictionCakeWinnerCheck,
  PredictionWinnerJobBnb: predictionBnbWinnerCheck,
  UserPositionsNotifyTask: userPositionNotifyCheck,
  WhitelistFarmsNotifyTask: whiteListFarmsCheck,
  GlobalTaskUtils: globalTasksJob,
};
