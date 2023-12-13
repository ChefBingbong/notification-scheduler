import { ChainId } from "@pancakeswap/chains";
import { Address, getAddress } from "viem";
import appConfig from "../config/config";
import { PredictionRound } from "../graph";
import {
  GRAPH_API_PREDICTION_BNB,
  GRAPH_API_PREDICTION_CAKE,
  getPredictionRoundsWinners,
} from "../graph/predictions/getUserBetHistory";
import { redisClient, service } from "../index";

import {
  BuilderNames,
  getPredictionWelcomeNotificationBody,
  getPredictionsNotificationBody,
  getPredictionsNotificationUpdateBody,
  sendPushNotification,
} from "../util/pushUtils";
import { SharedCronTask } from "./sharedCronTask";

export class PredictionWinnerJob extends SharedCronTask {
  private predictionType: "CAKE" | "BNB";
  private GRAPH_API: string;

  constructor(jobId: string, schedule: string, supportedChains: ChainId[], predictionType: "CAKE" | "BNB") {
    super(jobId, schedule, supportedChains);
    this.predictionType = predictionType;
    predictionType === "CAKE"
      ? (this.GRAPH_API = GRAPH_API_PREDICTION_CAKE)
      : (this.GRAPH_API = GRAPH_API_PREDICTION_BNB);
  }

  public async init(chainId: ChainId) {
    const subscribers = await this.getFormattedSubscribers();
    this.executeCronTask(chainId, subscribers, this.getClient(chainId));
  }

  protected async mainFunction(network: ChainId, users: Address[]) {
    try {
      const latestRoundData = await getPredictionRoundsWinners(this.GRAPH_API);
      await this.findWinnersAndNotify(latestRoundData[0], users, this.predictionType);

      this.job.cronJob.stop();
      const newSchedule = await this.calculateNewCronSchedule(Number(latestRoundData[0].startAt), 15, 5);
      console.log(this.job.jobName, newSchedule);

      const newJobInstance = new PredictionWinnerJob(
        `predictions-cron-result-${this.predictionType.toLowerCase()}`,
        newSchedule,
        [ChainId.BSC],
        this.predictionType
      );
      service.initBnbChainJobs([newJobInstance] as any);
    } catch (error) {
      console.error("Error fetching Lottery data:", error);
    }
  }

  private async findWinnersAndNotify(round: PredictionRound, users: Address[], asset: "CAKE" | "BNB") {
    const usersToNotify: Address[] = [];
    const cacheKeyList: string[] = [];

    if (round.bets.length === 0 || (await redisClient.getLotteryRoundNotified(round.id))) return;
    const formattedUsers = users.map((u) => u.toLowerCase());

    for (const roundBet of round.bets) {
      const user = roundBet.user.id.toLowerCase() as Address;
      if (!formattedUsers.includes(user)) continue;
      if (!roundBet.claimed) cacheKeyList.push(`notification:${this.job.jobName}:${round.id}:${user}`);
    }

    if (cacheKeyList.length > 0) {
      const notifiedForRounds = await redisClient.client.mget(...cacheKeyList);
      for (let i = 0; i < cacheKeyList.length; i++) {
        if (notifiedForRounds[i]) continue;

        const [, , , user] = cacheKeyList[i].split(":");
        usersToNotify.push(getAddress(user) as Address);
        await redisClient.client.set(cacheKeyList[i], "true", "PX", 1000 * 60 * 60 * 24 * 7);
      }
      const usersNotNotified = users.filter((user) => !usersToNotify.includes(user));
      await this.buildAndSendNotification(usersToNotify, usersNotNotified, round.id);
    }
  }

  private async buildAndSendNotification(users: Address[], usersNotNotified: Address[], roundId: string) {
    if (users.length > 0) {
      const modifiedArray = users.map((item) => `eip155:1:${item}`);
      const notificationBody = getPredictionsNotificationBody(this.predictionType, roundId);

      await sendPushNotification(
        BuilderNames.predictionWinnerNotification,
        [modifiedArray, notificationBody, this.predictionType],
        users
      );
    }
    if (usersNotNotified.length > 0) {
      const modifiedArray = usersNotNotified.map((item) => `eip155:1:${item}`);
      const notificationBody = getPredictionsNotificationUpdateBody(this.predictionType, roundId);

      await sendPushNotification(
        BuilderNames.predictionParticipationNotification,
        [modifiedArray, notificationBody, this.predictionType],
        usersNotNotified
      );
    }
  }
}

export class PredictionOnBoardJob extends SharedCronTask {
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
      const usersToNotify: Address[] = [];

      const userTimestampKeys = redisClient.getUserTimestampKeys(network, this.job.jobName, users);
      const existResults = await redisClient.existUserNotificationBatch(userTimestampKeys);

      for (let i = 0; i < users.length; i++) {
        if (existResults[i]) continue;
        keysToSet.push(userTimestampKeys[i]);
        usersToNotify.push(users[i]);
      }

      await this.buildAndSendNotification(usersToNotify, keysToSet);
    } catch (error) {
      console.error("Error fetching Lotteery data:", error);
    }
  }

  private async buildAndSendNotification(users: Address[], keysToSet: string[]) {
    if (users.length === 0) return;

    const modifiedArray = users.map((item) => `eip155:1:${item}`);
    const notificationBody = getPredictionWelcomeNotificationBody();

    await sendPushNotification(BuilderNames.predictionNotifyNotification, [modifiedArray, notificationBody], users);
    await redisClient.storeUseNotificationBatch(keysToSet, "prediction notified");
  }
}

export const predictionCakeWinnerCheck = new PredictionWinnerJob(
  `predictions-cron-result-cake`,
  appConfig.predictionWinnerSchedule,
  [ChainId.BSC],
  "CAKE"
);

export const predictionBnbWinnerCheck = new PredictionWinnerJob(
  `predictions-cron-result-bnb`,
  appConfig.predictionWinnerSchedule,
  [ChainId.BSC],
  "BNB"
);

export const predictionNotifyNewUsersCheck = new PredictionOnBoardJob(
  `predictions-cron-notify`,
  appConfig.predictionUpdateSchedule,
  [ChainId.BSC]
);
