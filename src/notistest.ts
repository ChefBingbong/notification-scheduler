import { ChainId } from "@pancakeswap/chains";
import { Address, getAddress } from "viem";
import { RedisClient } from "./redis";
import { nativeToId } from "./util/fetchTokenPrice";
import {
  BuilderNames,
  getBalanceNotificationBody,
  getLotteryNotificationBody1,
  sendPushNotification,
} from "./util/pushUtils";
import { getFormattedTime } from "./util/timeCalculator";

export let redisClient: RedisClient;

const sendnotis = async () => {
  const networkName = nativeToId(56);

  const subscribersFormatted = await redisClient.getSubscribers<Address>("subscribers_formatted");
  const subscribers = await redisClient.getSubscribers<string>("subscribers");
  console.log(getAddress("0xa9c60777fd1a95602d6c080a72ff02324373f609"));
  const notificationBody = getBalanceNotificationBody();

  await sendPushNotification(
    BuilderNames.lowBalanceNotification,
    [["eip155:1:0x4A64820F3036691Dc0EA31663d626F7BE9C201f3"], notificationBody, ChainId.ARBITRUM_ONE],
    ["0x4A64820F3036691Dc0EA31663d626F7BE9C201f3"]
  );

  // await sendPushNotification(
  //   BuilderNames.tokenPriceMovementNotification,
  //   [
  //     ["eip155:1:0x34284045552E47a4b687C479CF00A5a56Cb8596A", "eip155:1:0x694733E386d9c47744873B3399C487D6D030481f"],
  //     "ethereum",
  //     true,
  //     "5.02",
  //     2000,
  //     1500,
  //     Boolean(2000 - 1500 > 0),
  //   ],
  //   ["0x34284045552E47a4b687C479CF00A5a56Cb8596A", "0x694733E386d9c47744873B3399C487D6D030481f"] as any
  // );
  // const network = CHAIN_ID_TO_CHAIN_NAME[1];
  // const notificationBody1 = getFarmAPRNotificationBody("ETH-USDC LP, CAKE-BNB- LP", network, 30, 15);

  // await sendPushNotification(
  //   BuilderNames.farmAprNotification,
  //   [["eip155:1:0x4A64820F3036691Dc0EA31663d626F7BE9C201f3"], notificationBody1, network],
  //   ["0x4A64820F3036691Dc0EA31663d626F7BE9C201f3"]
  // );

  const body = getLotteryNotificationBody1([
    "0 days, and 18 hours ",
    ["0x4A64820F3036691Dc0EA31663d626F7BE9C201f3"],
    4.5,
    30,
    "10000",
    "2400",
  ]);
  // const body = getLotteryNotificationBody2([55]);
  // const body = getLotteryNotificationBody3();
  // const body = getLotteryNotificationBody4();
  // const body = getPredictionsNotificationBody();
  // const body = getPredictionWelcomeNotificationBody();

  // await sendPushNotification(
  //   BuilderNames.lotteryNotification,
  //   [["eip155:1:0x4A64820F3036691Dc0EA31663d626F7BE9C201f3"], body],
  //   ["0x4A64820F3036691Dc0EA31663d626F7BE9C201f3"]
  // );

  // await sendPushNotification(BuilderNames.predictionNotifyNotification, [
  //   ["eip155:1:0x4634fC1462B7974dB96B700E9aBe915f0884e60a"],
  //   body,
  // ]);
  // const lpSymbolString = arrayToString(["CAKE-BNB LP"]);
  // const subscriberBody = getLPOutOfRangeBody(CHAIN_ID_TO_CHAIN_NAME[56], lpSymbolString);

  // await sendPushNotificationWithPayload(
  //   {
  //     accounts: subscribers,
  //     notification: {
  //       title: "New Arbitrum rewards with Gamma",
  //       body: "Stake WETH-ARB (0.05%) v3 LP, Earn ARB and CAKE! Seed liquidity, stake LP token, and claim rewards all on Gamma",
  //       icon: "https://assets.pancakeswap.finance/web/chains/42161.png",
  //       url: "https://app.gamma.xyz/vault/cake/arbitrum/details/weth-arb-500-narrow",
  //       type: "5e0b7598-7fbe-4695-8a3c-b14cb4b78a11",
  //     },
  //   },
  //   subscribersFormatted
  // );
  // const body = getTradingRewardOnBoardBody();

  // await sendPushNotification(BuilderNames.tradingRewardNotification, [
  //   ["eip155:1:hasActivated"],
  //   body,
  //   "Earn Free Trading Rewards",
  // ]);
  // const hasActivated = true;
  // const timeRemaining = getFormattedTime(1700513535);
  // const notificationBody = hasActivated
  //   ? getTradingRewardUnclaimedBody(4.2, timeRemaining)
  //   : getTradingRewardActivationBody();
  // const title = hasActivated ? "Unclaimed Trading Reward" : "Trading reward Account Activation";
  // await sendPushNotification(BuilderNames.tradingRewardNotification, [
  //   [`eip155:1:0x4634fC1462B7974dB96B700E9aBe915f0884e60a`],
  //   notificationBody,
  //   title,
  // ]);
};

// sendnotis();

const t = getFormattedTime(1702382400);
console.log(t);
