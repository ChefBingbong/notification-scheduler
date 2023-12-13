import axios from "axios";
import appConfig from "../config/config";
import { Address } from "viem";
import { ChainId } from "@pancakeswap/chains";

export enum NotificationView {
  onBoarding,
  Notifications,
  Settings,
}

const tokensToDisplayName = {
  [ChainId.BSC]: "BNB",
  [ChainId.BSC_TESTNET]: "tBNB",
  [ChainId.ETHEREUM]: "ETH",
  [ChainId.POLYGON_ZKEVM]: "POLYGON",
  [ChainId.ZKSYNC]: "ZKSYNC",
  [ChainId.ARBITRUM_ONE]: "ARB",
  [ChainId.LINEA]: "LINEA",
  [ChainId.BASE]: "BASE",
};

const chainIdToDisplayName: { [token: string]: number } = {
  ["ethereum"]: 1,
  ["binancecoin"]: 56,
};

export const getLotteryNotificationBody1 = (args: any[]) =>
  `${args[0]} remaining until the next lottery draw. Enter to have a chance to win ${args[2]} CAKE worth over $${args[1]}.`;
export const getLotteryNotificationBody2 = (args: any[]) =>
  `Just ${args[0]} until the next lottery draw. Dont forget to check your numbers and wait for the result. Best of luck to everyone`;
export const getLotteryNotificationBody3 = () => `Congratulations. You can now claim your CAKE rewards`;
export const getLotteryNotificationBodyRoundOver = (roundId: string) => `Round ${roundId} is over. View the results`;
export const getLotteryNotificationBody4 = () =>
  `You have won in the lottery and currently have unclaimed prizes. Dont miss out and be sure to claim your reward by following the link below`;
export const getBalanceNotificationBody = () => `Top up or purchase via Buy Crypto with the link below`;
export const getPredictionsNotificationBody = (asset: "CAKE" | "BNB", roundId: string) =>
  `Congratulations! The results for prediction round ${roundId} are out. You can now claim your ${asset} rewards via the link below`;
export const getPredictionsNotificationUpdateBody = (asset: "CAKE" | "BNB", roundId: string) =>
  `The results for ${asset} prediction round ${roundId} are out. You can view them with the link below`;
export const getPredictionWelcomeNotificationBody = () =>
  `Want to have some fun betting on the price of CAKE and BNB. Well if so try out Pancake Predictions to be in with a chance to win CAKE and BNB`;
export const getFarmAPRNotificationBody = (farms: string, chainId: string, currentApr: number, lastApr: number) =>
  `There has been movement in the following farm on ${chainId}. ${farms}. Its APR has moved by over ${
    currentApr - lastApr > 0 ? "+" : "-"
  }30% in the last 24 hours.\n \n \n Old APR: ${lastApr}%  \n \n Current APR: ${currentApr}%`;
export const getFarmAPRSNotificationBody = (farms: string, chainId: string) =>
  `There has been movement in the following farms on ${chainId}. ${farms}. their APR's have all moved by over 30% in the last 24 hours`;
export const getTradingRewardUnclaimedBody = (reward: number, timeRemainingToClaim: string) =>
  `Congrats!, you have unclaimed trading rewards that you can collect worth ${reward} USD. Follow the link below to claim. you have ${timeRemainingToClaim} left before your reward expires.`;
export const getTradingRewardActivationBody = () =>
  `you have unclaimed trading rewards but you need to activate your profile to collect. Activate your profile below.`;
export const getTradingRewardOnBoardBody = () =>
  `Have you tried the pancakeswap trading rewards program? Start trading any eligible pairs to earn rewards in CAKE.  \n \n The more you trade, the more rewards you will earn from the current reward pool. \n \n Learn more through the link below`;
export const getLPOutOfRangeBody = (chainId: string, lpSymbols: string) =>
  `Your liquidity position ${lpSymbols} on ${chainId} is no longer in its price range. Please readjust your position to earn LP fees`;
export const getLPsOutOfRangeBody = (chainId: string, lpSymbol: string) =>
  `Your liquidity positions ${lpSymbol} on ${chainId} are out of the current price range. Please readjust your position to earn LP fees`;

export type NotificationType = {
  account: string;
  date: number;
  description: string;
  id: number;
  title: string;
  type: string;
};

export type NotifyType = {
  title: string;
  description: string;
};

export enum BuilderNames {
  LPOutOfRangeNotification = "LPOutOfRangeNotification",
  tokenPriceMovementNotification = "tokenPriceMovementNotification",
  lotteryNotification = "lotteryNotification",
  lowBalanceNotification = "lowBalanceNotification",
  predictionWinnerNotification = "predictionWinnerNotification",
  predictionNotifyNotification = "predictionNotifyNotification",
  predictionParticipationNotification = "predictionParticipationNotification",
  farmAprNotification = "farmAprNotification",
  tradingRewardNotification = "tradingRewardNotification",
}

enum ScopeIdsToName {
  Lottery = "b42403b3-2712-4e1e-8cc7-cb2d9c1350b4",
  Prediction = "52816341-59cd-49e2-8f3b-d15bf2c107fb",
  Liquidity = "02879833-eb9c-4cc3-8760-f762ab218ca6",
  Farms = "cf41e730-22d8-42d6-a7d5-1e79b6f7820b",
  PriceUpdates = "ad885f1d-3f25-46ea-916a-7ebe630b6f98",
  Promotional = "87393202-5cd7-4a0b-a672-bd4eded25e7b",
  Alerts = "069d1195-50a0-47b0-81a6-2df3024831ba",
  TradingReward = "e0a3aeb3-3ec2-496d-b6c7-343185de6aca",
}

export type pushNotification = {
  title: string;
  body: string;
  icon: string;
  url: string;
  type: string;
};

export type NotificationPayload = {
  accounts: string[];
  notification: pushNotification;
};

export interface PancakeNotificationBuilders {
  ["LPOutOfRangeNotification"]: { LPOutOfRangeNotification: () => pushNotification };
  ["tokenPriceMovementNotification"]: {
    tokenPriceMovementNotification: (
      token1: string,
      token2: string,
      token1Amount: string,
      token2Amount: string
    ) => pushNotification;
  };
  ["lotteryNotification"]: { lotteryNotification: () => pushNotification };
  ["lowBalanceNotification"]: {
    lowBalanceNotification: (accounts: string[], body: string, chainId: number) => pushNotification;
  };
  ["predictionWinnerNotification"]: {
    predictionWinnerNotification: (accounts: string[], body: string, chainId: number) => pushNotification;
  };
  ["predictionParticipationNotification"]: {
    predictionParticipationNotification: (accounts: string[], body: string, chainId: number) => pushNotification;
  };
  ["predictionNotifyNotification"]: {
    predictionNotifyNotification: (accounts: string[], body: string, chainId: number) => pushNotification;
  };
  ["farmAprNotification"]: {
    farmAprNotification: (accounts: string[], body: string, chainId: number) => pushNotification;
  };
  ["tradingRewardNotification"]: {
    tradingRewardNotification: (accounts: string[], body: string, chainId: number) => pushNotification;
  };
}

export const PancakeNotifications: {
  [notificationBuilder in keyof PancakeNotificationBuilders]: <T>(args: T[]) => NotificationPayload;
} = {
  LPOutOfRangeNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: "Liquidity Out Of Range",
        body: args[1],
        icon: `https://pancakeswap.finance/logo.png`,
        url: "https://pancakeswap.finance/liquidity",
        type: ScopeIdsToName.Liquidity,
      },
    };
  },
  tokenPriceMovementNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `${tokensToDisplayName[args[7] as string]} Price Movement`,
        body: `The price of ${args[1]} has ${args[6] ? "risen" : "fallen"} by over ${
          args[3]
        }% in the past hour. \n \n \n Old price: $${args[5]}  \n \n Current Price: $${args[4]}`,
        icon: `https://assets.pancakeswap.finance/web/native/${
          chainIdToDisplayName[args[1] as "ethereum" | "binancecoin"]
        }.png`,
        url: `https://www.coingecko.com/en/coins/${args[1]}`,
        type: ScopeIdsToName.PriceUpdates,
      },
    };
    // ... add more as we create use cases
  },
  lotteryNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `PancakeSwap Lottery`,
        body: args[1],
        icon: `https://pancakeswap.finance/images/lottery/ticket-r.png`,
        url: `https://pancakeswap.finance/lottery`,
        type: ScopeIdsToName.Lottery,
      },
    };
  },
  lowBalanceNotification: (args): any => {
    return {
      accounts: args[0],
      notification:
        args[2] === ChainId.OPBNB
          ? {
              title: `Your BNB Balance is Low`,
              body: "Top up your gas token via opBNB bridge",
              icon: `https://assets.pancakeswap.finance/web/chains/${args[2]}.png`,
              type: ScopeIdsToName.Alerts,
            }
          : {
              title: `Your ${[56, 204].includes(args[2] as number) ? "BNB" : "ETH"} Balance is Low`,
              body: args[1],
              icon: `https://assets.pancakeswap.finance/web/chains/${args[2]}.png`,
              url: `https://pancakeswap.finance/buy-crypto`,
              type: ScopeIdsToName.Alerts,
            },
    };
  },
  predictionWinnerNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `${args[2]} Predictions Winner`,
        body: args[1],
        icon: `https://pancakeswap.finance/images/decorations/prediction.png`,
        url: `https://pancakeswap.finance/prediction`,
        type: ScopeIdsToName.Prediction,
      },
    };
  },
  predictionParticipationNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `${args[2]} Predictions Results`,
        body: args[1],
        icon: `https://pancakeswap.finance/images/decorations/prediction.png`,
        url: `https://pancakeswap.finance/prediction`,
        type: ScopeIdsToName.Prediction,
      },
    };
  },
  predictionNotifyNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `PancakeSwap Predictions`,
        body: args[1],
        icon: `https://pancakeswap.finance/images/decorations/prediction.png`,
        url: `https://pancakeswap.finance/prediction`,
        type: ScopeIdsToName.Prediction,
      },
    };
  },
  farmAprNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `Farms APR Update ${(args[2] as string).toUpperCase()}`,
        body: args[1],
        icon: `https://pancakeswap.finance/logo.png`,
        url: `https://pancakeswap.finance/farms`,
        type: ScopeIdsToName.Farms,
      },
    };
  },
  tradingRewardNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: args[2],
        body: args[1],
        icon: `https://pancakeswap.finance/images/trading-reward/gold-mobile.png`, // TODO: change it
        url: `https://pancakeswap.finance/trading-reward`,
        type: ScopeIdsToName.Alerts,
      },
    };
  },
};

export const sendPushNotification = async (notificationType: BuilderNames, args: Array<any>, users: Address[]) => {
  const notificationPayload = PancakeNotifications[notificationType](args);

  try {
    const notifyResponse = await axios.post(
      `https://notify.walletconnect.com/${appConfig.walletConnectApiKey}/notify`,
      notificationPayload, // Pass the payload directly as data
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${appConfig.walletConnectSecretKey}`,
        },
      }
    );
    console.log(notifyResponse.data);
    if (notifyResponse?.data?.sent.length > 0) {
      console.log("wallet-connect notification sent to some users");
      await sendBrowserNotification("PancakeSwap Alert", "You have new updates from PancakeSwap DEX.", users);
    }
  } catch (error) {
    // @ts-ignore
    console.error("send notification error", error.response.data);
  }
};

export const sendPushNotificationWithPayload = async (notificationPayload: NotificationPayload, users: Address[]) => {
  try {
    const notifyResponse = await axios.post(
      `https://notify.walletconnect.com/${appConfig.walletConnectApiKey}/notify`,
      notificationPayload, // Pass the payload directly as data
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${appConfig.walletConnectSecretKey}`,
        },
      }
    );
    if (notifyResponse?.data?.sent.length > 0) {
      console.log("wallet-connect notification sent to some users");
      await sendBrowserNotification("PancakeSwap Alert", "You have new updates from PancakeSwap DEX.", users);
    }
    return notifyResponse?.data;
  } catch (error) {
    // @ts-ignore
    console.error("send notification error", error.response.data);
    return error.response.data;
  }
};

export async function sendBrowserNotification(title: string, body: string, users: string[]) {
  try {
    await fetch("https://lobster-app-6lfpi.ondigitalocean.app/broadcast-notifications", {
      method: "POST",
      body: JSON.stringify({ notification: { title, body }, users }),
      headers: {
        "Content-Type": "application/json",
        "x-secure-token": appConfig.secureToken as string,
      },
    });
  } catch (error: any) {
    console.error("Failed to send browser notification", error.message);
  }
}
