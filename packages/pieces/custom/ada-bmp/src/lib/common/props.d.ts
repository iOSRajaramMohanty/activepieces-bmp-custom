/**
 * Mapping from channel names to platform codes
 */
export declare const CHANNEL_TO_PLATFORM: Record<string, string>;
export declare const channelInfo: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
export declare const adaBmpChannel: <R extends boolean>(required: R) => R extends true ? import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>> : import("@activepieces/pieces-framework").DropdownProperty<string, false, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>>;
export declare const adaBmpChannelForBulk: <R extends boolean>(required: R) => R extends true ? import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>> : import("@activepieces/pieces-framework").DropdownProperty<string, false, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>>;
export declare const adaBmpAccount: <R extends boolean>(required: R) => R extends true ? import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>> : import("@activepieces/pieces-framework").DropdownProperty<string, false, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>>;
export declare const recipientInputType: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
export declare const recipientFromList: <R extends boolean>(required: R) => R extends true ? import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>> : import("@activepieces/pieces-framework").DropdownProperty<string, false, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>>;
export declare const recipientManual: <R extends boolean>(required: R) => R extends true ? import("@activepieces/pieces-framework").ShortTextProperty<true> : import("@activepieces/pieces-framework").ShortTextProperty<false>;
export declare const messageText: import("@activepieces/pieces-framework").LongTextProperty<true>;
export declare const otpText: import("@activepieces/pieces-framework").ShortTextProperty<true>;
export declare const messageType: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
export declare const adaBmpContactCategory: <R extends boolean>(required: R) => R extends true ? import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>> : import("@activepieces/pieces-framework").DropdownProperty<string, false, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>>;
export declare const adaBmpTemplateCategory: import("@activepieces/pieces-framework").DropdownProperty<string, false, undefined>;
export declare const adaBmpTemplate: <R extends boolean>(required: R) => R extends true ? import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>> : import("@activepieces/pieces-framework").DropdownProperty<string, false, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>>;
