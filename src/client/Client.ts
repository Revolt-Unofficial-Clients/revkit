import EventEmitter from "eventemitter3";

export interface ClientOptions {
  apiURL: string;
  debug: boolean;
  heartbeat: number;
  pingTimeout?: boolean;
  reconnect: boolean;
  unreads: boolean;
}
const DefaultOptions: ClientOptions = {
  apiURL: "https://api.revolt.chat",
  debug: false,
  heartbeat: 30,
  reconnect: true,
  unreads: false,
};

export default class Client extends EventEmitter {
  constructor(options: Partial<ClientOptions>) {
    super();
    options = { ...DefaultOptions, ...options };
  }
}
