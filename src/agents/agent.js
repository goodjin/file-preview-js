/**
 * 智能体实例：封装岗位信息与消息处理入口。
 */
export class Agent {
  /**
   * @param {{id:string, roleId:string, roleName:string, rolePrompt:string, behavior:Function}} options
   */
  constructor(options) {
    this.id = options.id;
    this.roleId = options.roleId;
    this.roleName = options.roleName;
    this.rolePrompt = options.rolePrompt;
    this._behavior = options.behavior;
  }

  /**
   * 处理收到的异步消息。
   * @param {any} ctx 运行时上下文
   * @param {{payload:any, from:string, to:string, taskId?:string}} message
   * @returns {Promise<void>}
   */
  async onMessage(ctx, message) {
    await this._behavior(ctx, message);
  }
}
