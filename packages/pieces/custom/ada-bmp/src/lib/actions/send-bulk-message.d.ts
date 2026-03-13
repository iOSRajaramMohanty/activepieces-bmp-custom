export declare const sendBulkMessageAction: import("@activepieces/pieces-framework").IAction<import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    info: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    channel: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    contactCategory: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    messageType: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    account: import("@activepieces/pieces-framework").DropdownProperty<string, true, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    templateCategory: import("@activepieces/pieces-framework").DropdownProperty<string, false, undefined>;
    template: import("@activepieces/pieces-framework").DropdownProperty<string, false, import("@activepieces/pieces-framework").CustomAuthProperty<{
        apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
        environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
    }>>;
    message: import("@activepieces/pieces-framework").LongTextProperty<true>;
}>;
