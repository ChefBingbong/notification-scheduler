import { expect } from "chai";
import { Address } from "viem";

type BalanceStorage = {
  usersToNotify: string[];
  newUserBalances: number[];
};

type MockData = {
  users: Address[];
  networkName: string;
  userBalances: number[];
  cachedBalances: number[];
  marketPriceOfBalance: number;
};

enum TEST_RETURN_MESSAGES {
  EARLY_RETURN_NO_NOTIFICATION = "CACHE EQUALS CURRENT RETURN EARLY",
  NOTIFCATION_SENT = "BALANCE BELOW THRESHOLD SEND NOTIFICATION",
  NO_NOTIFICATION_SENT = "NO NOTIFICATION SENT",
}

const checkSubscriberBalances = (mockData: MockData) => {
  const marketPriceOfBalance = mockData.marketPriceOfBalance;

  const userBalances = mockData.userBalances;
  const cachedBalance = mockData.cachedBalances;

  const newBalanceStorage: BalanceStorage = {
    usersToNotify: [],
    newUserBalances: [],
  };
  const testOutcome: string[] = [];
  for (let subscriberIndex = 0; subscriberIndex < mockData.users.length; subscriberIndex++) {
    const currentBalance = userBalances[subscriberIndex];
    const cachedUserBalance = cachedBalance[subscriberIndex];

    if (currentBalance === cachedUserBalance) {
      testOutcome.push("CACHE EQUALS CURRENT RETURN EARLY");
      continue;
    }

    const isBalanceBelowThreshold = marketPriceOfBalance * currentBalance < 15;

    if (currentBalance !== cachedUserBalance && isBalanceBelowThreshold) {
      newBalanceStorage.newUserBalances.push(currentBalance);
      newBalanceStorage.usersToNotify.push(`eip155:1:${mockData.users[subscriberIndex]}`);

      testOutcome.push("BALANCE BELOW THRESHOLD SEND NOTIFICATION");
      continue;
    }
  }
  testOutcome.push("NO NOTIFICATION SENT");

  return testOutcome[0];
};

describe("Low Balance Test", function () {
  describe("Send Notifications", function () {
    it("should send notification when users balane is below the threshold and current bal doesnt equal cache", function () {
      const successData: MockData = {
        users: ["0x9D679DbaBcBD2121d747d1637c9870adCCEEf2A8"],
        networkName: "ethereum",
        userBalances: [0.0002],
        cachedBalances: [0.1],
        marketPriceOfBalance: 1950,
      };
      const testResult = checkSubscriberBalances(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NOTIFCATION_SENT);
    });
  });

  describe("Don't Notifications (return early)", function () {
    it("should return early when users balane equals the cache", function () {
      const earlyReturnData: MockData = {
        users: ["0x9D679DbaBcBD2121d747d1637c9870adCCEEf2A8"],
        networkName: "ethereum",
        userBalances: [0.01],
        cachedBalances: [0.01],
        marketPriceOfBalance: 1950,
      };
      const testResult = checkSubscriberBalances(earlyReturnData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.EARLY_RETURN_NO_NOTIFICATION);
    });

    it("should return early when users balance is above threshold but still equal cache", function () {
      const earlyReturnData: MockData = {
        users: ["0x9D679DbaBcBD2121d747d1637c9870adCCEEf2A8"],
        networkName: "ethereum",
        userBalances: [0.2],
        cachedBalances: [0.2],
        marketPriceOfBalance: 1950,
      };
      const testResult = checkSubscriberBalances(earlyReturnData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.EARLY_RETURN_NO_NOTIFICATION);
    });
  });

  describe("Don't Notifications (full cycle)", function () {
    it("should return early when users balane equals the cache", function () {
      const earlyReturnData: MockData = {
        users: ["0x9D679DbaBcBD2121d747d1637c9870adCCEEf2A8"],
        networkName: "ethereum",
        userBalances: [0.01],
        cachedBalances: [0.01],
        marketPriceOfBalance: 1950,
      };
      const testResult = checkSubscriberBalances(earlyReturnData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.EARLY_RETURN_NO_NOTIFICATION);
    });

    it("should not send notification if users balance does not equal cache but is above threshold", function () {
      const mockData: MockData = {
        users: ["0x9D679DbaBcBD2121d747d1637c9870adCCEEf2A8"],
        networkName: "ethereum",
        userBalances: [0.2],
        cachedBalances: [0.01],
        marketPriceOfBalance: 1950,
      };
      const testResult = checkSubscriberBalances(mockData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NO_NOTIFICATION_SENT);
    });

    it("should not send notification if users balance is above threshold", function () {
      const mockData: MockData = {
        users: ["0x9D679DbaBcBD2121d747d1637c9870adCCEEf2A8"],
        networkName: "ethereum",
        userBalances: [0.1],
        cachedBalances: [0.01],
        marketPriceOfBalance: 1950,
      };
      const testResult = checkSubscriberBalances(mockData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NO_NOTIFICATION_SENT);
    });

    it("should not send notification if there are no users", function () {
      const mockData: MockData = {
        users: [],
        networkName: "ethereum",
        userBalances: [0.1],
        cachedBalances: [0.01],
        marketPriceOfBalance: 1950,
      };
      const testResult = checkSubscriberBalances(mockData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NO_NOTIFICATION_SENT);
    });
  });
});
