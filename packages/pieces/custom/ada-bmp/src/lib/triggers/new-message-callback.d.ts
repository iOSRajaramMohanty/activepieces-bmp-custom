import { TriggerStrategy } from '@activepieces/pieces-framework';
/**
 * BMP callback URL trigger (Slack-style app webhook).
 * BMP backend must send platform, accountNo, and eventType in every request.
 * Only flows whose selected channel/account match the payload will run.
 */
export declare const newMessageCallbackTrigger: import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.WEBHOOK, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    info: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    channel: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    account: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.POLLING, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    info: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    channel: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    account: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.MANUAL, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    info: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    channel: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    account: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.APP_WEBHOOK, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    info: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    channel: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    account: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
}>;
