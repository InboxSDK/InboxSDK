declare module 'order-manager' {
  export type Order<T> = {
    id: string;
    value: T;
  };
  export class OrderManager<T> {
    constructor(options: { get(): T | null; set(value: T): void });
    getOrderedItems(): Order<T>[];
    moveItem(fromIndex: number, toIndex: number): void;
    reload(): void;
    addItem(value: {
      id: string;
      groupId?: string;
      orderHint?: number;
      value: T;
    }): void;
    removeItemByIndex(index: number): void;
    updateItemValueByIndex(index: number, value: T): void;
  }

  export default OrderManager;
}
