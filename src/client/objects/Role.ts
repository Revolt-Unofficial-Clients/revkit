import { APIRole } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";
import Server from "./Server";

export default class Role extends BaseObject<APIRole> {
  constructor(client: Client, public server: Server, data: APIRole) {
    super(client, data);
  }
}
