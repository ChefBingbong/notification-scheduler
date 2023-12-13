import { Address } from "viem";
import { WhitelistedFarms } from "../../graph";

export type SubscriberAddress = `eip155:${number}:${Address}` | string | WhitelistedFarms;

type Instance<O> = {
  groupSize: number;
  groupIndex: number;
  originalGroup: O[];
  currentGroup: O[];
};

export type LoadBalancerInstance<O> = Map<string, Instance<O>>;

enum InstancesTypes {
  userPositionsBalancer = "userPositionsBalancer",
}

export class LoadBalancerBatcher<O> {
  // private static groupSize: number;
  private static loadBalancerInstances: LoadBalancerInstance<any>;

  constructor() {
    LoadBalancerBatcher.loadBalancerInstances = new Map();
  }

  public getCurrentInstanceState<O>(key: string): {
    currentGroup: O[];
  } {
    const currentGroup = LoadBalancerBatcher.loadBalancerInstances.get(key).currentGroup;
    return { currentGroup };
  }

  public initializeInstance<O>(key: string, originalGroup: O[], groupSize: number): void {
    const subscriberLen = originalGroup.length;

    if (subscriberLen === 0) {
      throw new Error(`Error check your array has one element and is bigger than group size`);
    }
    LoadBalancerBatcher.loadBalancerInstances.set(key, {
      groupSize: groupSize,
      groupIndex: 0,
      originalGroup,
      currentGroup: this.getCurrentGroup(0, groupSize, originalGroup).subscribers,
    });
  }

  public getNextGroup<O>(key: string): {
    nextSubscribersGroup: O[];
  } {
    const instance = LoadBalancerBatcher.loadBalancerInstances.get(key);
    if (!instance) throw new Error(`Instance '${key}' not found`);

    this.incrementGroupIndex(instance);
    const { subscribers } = this.getCurrentGroup(instance.groupIndex, instance.groupSize, instance.originalGroup);
    instance.currentGroup = subscribers;

    return {
      nextSubscribersGroup: instance.currentGroup,
    };
  }

  public reset(key: string): void {
    const instance = LoadBalancerBatcher.loadBalancerInstances.get(key);
    if (!instance) throw new Error(`Instance '${key}' not found`);

    instance.groupIndex = 0;
    instance.currentGroup = this.getCurrentGroup(0, instance.groupSize, instance.originalGroup).subscribers;
  }

  public updateGroupSize(size: number, key: string): void {
    const instance = LoadBalancerBatcher.loadBalancerInstances.get(key);
    if (size > 0) {
      throw new Error(`group size cannot be smaller than 1`);
    }
    instance.groupSize = size;
  }

  public setUpdateactiveSubscribers<O>(key: string, subscribers: O[]): void {
    const instance = LoadBalancerBatcher.loadBalancerInstances.get(key);
    try {
      if (subscribers.length === 0) {
        throw new Error(`Error: Check your array; it has one element and is bigger than the group size`);
      }
      instance.originalGroup = subscribers;
    } catch (error) {
      console.error(
        `${
          (error as Error).message
        }: Error occured in setUpdateActiveSubscribers. will revert this call and continue as normal`
      );
      const originalActiveSubscribers = instance.originalGroup;
      instance.originalGroup = originalActiveSubscribers;
    }
  }

  public static getAlLoadBalancerlInstances<O>(): LoadBalancerInstance<O> {
    const allInstances = {} as LoadBalancerInstance<O>;
    LoadBalancerBatcher.loadBalancerInstances.forEach((instance: Instance<O>, key: string) => {
      allInstances[key] = instance;
    });
    return allInstances;
  }

  public static getLoadBalancerInstance<O>(key: string): Instance<O> {
    const instance = LoadBalancerBatcher.loadBalancerInstances.get(key);
    return instance;
  }

  public static getGroupSize(key: string): number {
    const instance = LoadBalancerBatcher.loadBalancerInstances.get(key);
    return instance.groupSize;
  }

  private getCurrentGroup<O>(
    groupIndex: number,
    groupSize: number,
    originalGroup: O[]
  ): {
    subscribers: O[];
  } {
    const startIndex = groupIndex * groupSize;
    const subscribers = originalGroup.slice(startIndex, startIndex + groupSize);

    return { subscribers };
  }

  private incrementGroupIndex<O>(instance: Instance<O>): void {
    const len = instance.originalGroup.length;
    instance.groupIndex = (instance.groupIndex + 1) % Math.ceil(len / instance.groupSize);
  }
}
export const loadBalancer = new LoadBalancerBatcher();
