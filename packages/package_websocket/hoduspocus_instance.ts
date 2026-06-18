import { Hocuspocus } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const hocuspocus = new Hocuspocus({
    extensions: [new Logger()],
    debounce: 2000,
    quiet: false,

    // Hook logs for testing
    async onConnect(data) {
        console.log(`[hocuspocus] onConnect — doc: "${data.documentName}", socket: ${data.socketId}`);
    },
    async connected(data) {
        console.log(`[hocuspocus] connected — doc: "${data.documentName}", socket: ${data.socketId}`);
    },
    async onDisconnect(data) {
        console.log(`[hocuspocus] onDisconnect — doc: "${data.documentName}", clients: ${data.clientsCount}`);
    },
    async onChange(data) {
        console.log(`[hocuspocus] onChange — doc: "${data.documentName}", clients: ${data.clientsCount}`);
    },
    async onLoadDocument(data) {
        console.log(`[hocuspocus] onLoadDocument — doc: "${data.documentName}"`);
    },
});

export { hocuspocus };
