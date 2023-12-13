import { ChainId } from "@pancakeswap/chains";
import "dotenv/config";
import { Logger } from "winston";
import { SupportedChain } from "./blockchain/chains";
import appConfig from "./config/config";
import { AllCronJobs, CronJobKeys } from "./cron";
import { GlobalTaskUtils } from "./cron/globalCronTaskUtils";
import { RedisClient } from "./redis";
import { AppLogger } from "./util/logger";

export class AppInitializer extends AppLogger {
  public log: Logger;
  private process: NodeJS.Process;
  public static redisClient: RedisClient;

  constructor() {
    super();
    this.log = this.getLogger("common-init");
    this.process = process;
  }

  public initMultiChainJobs(jobs: CronJobKeys[]): void {
    Object.values(SupportedChain).forEach((chain) => {
      this.setUpCronTasks(jobs, chain as any);
    });
  }

  public initBnbChainJobs(jobs: CronJobKeys[]): void {
    this.setUpCronTasks(jobs, ChainId.BSC as any);
  }

  public async commonInit(jobs: CronJobKeys[]): Promise<void> {
    await GlobalTaskUtils.updateGlobalCronState();

    this.process.on("unhandledRejection", this.handleError);
    this.process.on("uncaughtException", this.handleError);
    this.process.on("SIGINT", this.handleExit);
    this.process.on("SIGTERM", this.handleExit);

    this.initMultiChainJobs(jobs);
    this.log.info("Jobs started");
  }

  private handleExit = (): void => {
    this.log.info(`Stopping common-init closing server...`);
    this.process.exit(0);
  };

  private handleError = (err: Error): void => {
    this.log.error(`Unhandled error in common-init: ${err.message}`);
    this.process.exit(1);
  };

  private setUpCronTasks(jobs: CronJobKeys[], chainId: ChainId) {
    jobs.forEach((job) => {
      job.init(chainId);
    });
  }
}

export const redisClient = new RedisClient(appConfig.redisUrl);

export const service = new AppInitializer();
service.commonInit(Object.values(AllCronJobs));
