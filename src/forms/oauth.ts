import {APIResponse, PartialCall} from '@pagerduty/pdjs/build/src/api';
import {api} from '@pagerduty/pdjs';
import fetch from 'node-fetch';
import {AppCallRequest, AppCallValues, Oauth2CurrentUser, OauthUserToken, UserMe} from '../types';
import {KVStoreClient, KVStoreOptions, KVStoreProps} from '../clients/kvstore';
import {Routes, StoreKeys} from '../constant';
import {encodeFormData} from '../utils/utils';

export async function oauth2Connect(call: AppCallRequest): Promise<string> {
    const mattermostUrl: string | undefined = call.context.mattermost_site_url;
    const botAccessToken: string | undefined = call.context.bot_access_token;
    const oauth2CompleteUrl: string | undefined = call.context.oauth2?.complete_url;
    const state: string | undefined = call.values?.state;

    const kvOptions: KVStoreOptions = {
        mattermostUrl: <string>mattermostUrl,
        accessToken: <string>botAccessToken
    };
    const kvStoreClient = new KVStoreClient(kvOptions);
    const kvStoreProps: KVStoreProps = await kvStoreClient.kvGet(StoreKeys.config);

    const url: string = `https://identity.pagerduty.com${Routes.PagerDuty.OAuthAuthorizationPathPrefix}`;

    const urlWithParams = new URL(url);
    urlWithParams.searchParams.append('client_id', kvStoreProps.pagerduty_client_id);
    urlWithParams.searchParams.append('redirect_uri', <string>oauth2CompleteUrl);
    urlWithParams.searchParams.append('state', <string>state);
    urlWithParams.searchParams.append('response_type', 'code');
    urlWithParams.searchParams.append('scope', 'read write');

    return urlWithParams.href;
}

export async function oauth2Complete(call: AppCallRequest): Promise<void> {
    const mattermostUrl: string | undefined = call.context.mattermost_site_url;
    const botAccessToken: string | undefined = call.context.bot_access_token;
    const accessToken: string | undefined = call.context.acting_user_access_token;
    const oauth2CompleteUrl: string | undefined = call.context.oauth2?.complete_url;
    const values: AppCallValues | undefined = call.values;

    if (!values?.code) {
        throw new Error('Bad Request: code param not provided');
    }

    const kvOptions: KVStoreOptions = {
        mattermostUrl: <string>mattermostUrl,
        accessToken: <string>botAccessToken
    };
    const kvStoreClient = new KVStoreClient(kvOptions);
    const kvStoreProps: KVStoreProps = await kvStoreClient.kvGet(StoreKeys.config);

    const url: string = `https://identity.pagerduty.com${Routes.PagerDuty.OAuthTokenPathPrefix}`;
    const oauthData: any = {
        grant_type: 'authorization_code',
        client_id: kvStoreProps.pagerduty_client_id,
        client_secret: kvStoreProps.pagerduty_client_secret,
        redirect_uri: <string>oauth2CompleteUrl,
        code: values.code
    };
    const data: OauthUserToken = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: encodeFormData(oauthData)
    }).then((response) => response.json())
        .then((response) =>
            response.error
                ? Promise.reject(new Error(response.error_description))
                : response
        );

    const pdClient: PartialCall = api({ token: data.access_token, tokenType: data.token_type });
    const responseCurrentUser: APIResponse = await pdClient.get(Routes.PagerDuty.CurrentUserPathPrefix);
    const currentUser: UserMe = responseCurrentUser.data['user'];

    const kvOptionsOauth: KVStoreOptions = {
        mattermostUrl: <string>mattermostUrl,
        accessToken: <string>accessToken
    };
    const kvStoreClientOauth = new KVStoreClient(kvOptionsOauth);

    const storedToken: Oauth2CurrentUser = {
        token: data.access_token,
        user: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role
        }
    };
    await kvStoreClientOauth.storeOauth2User(storedToken);
}
