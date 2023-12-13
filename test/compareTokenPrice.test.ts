import { expect } from "chai";
import { nativeToId } from "../src/util/fetchTokenPrice";
import { timeElapsed } from "../src/util/timeCalculator";

type MockData = {
  lastPrice: number;
  lastNotifiedTime: number;
  network: number;
  tokenPrices: { [token: string]: number };
};

enum TEST_RETURN_MESSAGES {
  UPDATE_CACHE_AND_RETURN_EARLY = "CACHE EQUALS CURRENT RETURN EARLY",
  UPDATE_CACHE_AND_SEND = "UPDATED_CACHE_AND_SENT_NOTIFICATION",
  NOTIFCATION_SENT = "SEND NOTIFICATION",
  NO_NOTIFICATION_SENT = "NO NOTIFICATION SENT",
}

const fetchPriceJob = (mockData: MockData) => {
  const testOutcome: string[] = [];

  const token = nativeToId(mockData.network);
  const currentPrice = mockData.tokenPrices[token];

  const lastNotifiedTime = mockData.lastNotifiedTime;
  const lastPrice = mockData.lastPrice;
  const { isPositive } = isPriceIncrease(lastPrice, currentPrice);

  const { inHours: timeSinceLastNotify } = timeElapsed(lastNotifiedTime.toString());
  if (timeSinceLastNotify >= 2) {
    if (!isPositive) testOutcome.push(TEST_RETURN_MESSAGES.UPDATE_CACHE_AND_RETURN_EARLY);
    else testOutcome.push(TEST_RETURN_MESSAGES.UPDATE_CACHE_AND_SEND);
    return testOutcome[0];
  }
  if (!isPositive) testOutcome.push(TEST_RETURN_MESSAGES.NO_NOTIFICATION_SENT);
  else testOutcome.push(TEST_RETURN_MESSAGES.NOTIFCATION_SENT);

  return testOutcome[0];
};

const isPriceIncrease = (lastPrice: number, currentPrice: number) => {
  const priceDifference = currentPrice - lastPrice;
  const percentageIncrease = (priceDifference / lastPrice) * 100;
  return {
    percentageIncrease: percentageIncrease.toFixed(2),
    isPositive: Math.abs(percentageIncrease) >= 5,
  };
};
describe("Low Balance Test", function () {
  describe("Send Notifications (NO cache update)", function () {
    it("should send notification if price is greater than cache, greater than 5% and time < 2 hrs", function () {
      const successData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime() / 1000),
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 200 },
      };
      const testResult = fetchPriceJob(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NOTIFCATION_SENT);
    });

    it("should send notification if price is greater than cache, equal to 5% and time < 2 hrs", function () {
      const successData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime() / 1000),
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 105 },
      };
      const testResult = fetchPriceJob(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NOTIFCATION_SENT);
    });

    it("should send notification if price is greater than cache, greater to 5% and time > 2 hrs", function () {
      const mockData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime() / 1000) - 3 * 60 * 60 * 1000,
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 110 },
      };
      const testResult = fetchPriceJob(mockData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.UPDATE_CACHE_AND_SEND);
    });

    it("should send notification if price is greater than cache, equal to 5% negative and time < 2 hrs", function () {
      const successData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime() / 1000),
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 85 },
      };
      const testResult = fetchPriceJob(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NOTIFCATION_SENT);
    });
  });

  describe("Don't send notifications (cache upate)", function () {
    it("should update cache not send notification if price is greater than cache, less than 5% and time > 2 hrs", function () {
      const successData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime() / 1000) - 3 * 60 * 60 * 1000,
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 102 },
      };
      const testResult = fetchPriceJob(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.UPDATE_CACHE_AND_RETURN_EARLY);
    });

    it("should update cache not send notification if price is less than cache, less than 5% and time > 2 hrs", function () {
      const successData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime() / 1000) - 3 * 60 * 60 * 1000,
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 98 },
      };
      const testResult = fetchPriceJob(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.UPDATE_CACHE_AND_RETURN_EARLY);
    });
  });

  describe("Don't send notifications (no cache upate)", function () {
    it("should not send notification if price is less than cache, less than 5% and time < 2 hrs", function () {
      const successData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime()),
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 98 },
      };
      const testResult = fetchPriceJob(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NO_NOTIFICATION_SENT);
    });

    it("should not send notification if price is greater than cache, less than 5% and time < 2 hrs", function () {
      const successData: MockData = {
        lastNotifiedTime: Math.floor(new Date().getTime()),
        lastPrice: 100,
        network: 1,
        tokenPrices: { ["ethereum"]: 102 },
      };
      const testResult = fetchPriceJob(successData);
      expect(testResult).to.equal(TEST_RETURN_MESSAGES.NO_NOTIFICATION_SENT);
    });
  });
});
