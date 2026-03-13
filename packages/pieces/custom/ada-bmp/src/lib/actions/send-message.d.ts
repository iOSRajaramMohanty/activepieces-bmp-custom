export declare const sendMessageAction: import("@activepieces/pieces-framework").IAction<import("@activepieces/pieces-framework").CustomAuthProperty<{
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
    recipientType: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    recipientSelection: import("@activepieces/pieces-framework").DynamicProperties<true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    message: import("@activepieces/pieces-framework").LongTextProperty<true>;
}>;
