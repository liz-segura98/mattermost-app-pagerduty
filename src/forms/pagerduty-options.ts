import { api } from "@pagerduty/pdjs";
import { APIResponse, PartialCall } from "@pagerduty/pdjs/build/src/api";
import { PagerDutyClient, PagerDutyOptions, PagerDutyOpts } from "../clients/pagerduty";
import { ExceptionType, Routes } from "../constant";
import { AppSelectOption, AttachmentOption, Service } from "../types";
import { tryPromiseForGenerateMessage } from "../utils/utils";

export async function getServiceOptionList(pdOpt: PagerDutyOpts): Promise<AppSelectOption[]> {
   const pdClient: PartialCall = api({ token: pdOpt.token, tokenType: pdOpt.tokenType });
   const responseServices: APIResponse = await tryPromiseForGenerateMessage(
      pdClient.get(Routes.PagerDuty.ServicesPathPrefix),
      ExceptionType.MARKDOWN,
      'PagerDuty service failed'
   );
   const services: Service[] = responseServices?.data['services'];
   if (!!services){
      const options: AppSelectOption[] = [...services.map((b: any) => { return { label: b.name, value: b.id } })];
      return options;
   }
   
   return [];
}

export async function getUsersOptionList(pdOpt: PagerDutyOpts): Promise<AppSelectOption[]> {
   const pdClient: PartialCall = api({ token: pdOpt.token, tokenType: pdOpt.tokenType });
   const responseServices: APIResponse = await tryPromiseForGenerateMessage(
      pdClient.get(Routes.PagerDuty.UsersPathPrefix),
      ExceptionType.MARKDOWN,
      'PagerDuty service failed'
   );

   const users: Service[] = responseServices?.data['users'];
   if (!!users) {
      const options: AppSelectOption[] = [...users.map((b: any) => { return { label: b.email, value: b.id } })];
      return options;
   }

   return [];
}

export async function getUsersAttachmentOptionList(pdOpt: PagerDutyOptions): Promise<AttachmentOption[]> {
   const pagerDutyClient: PagerDutyClient = new PagerDutyClient(pdOpt);
   const response = await pagerDutyClient.getUsers();
   const users = response?.users;
   if (!!users) {
      const options: AttachmentOption[] = [...users.map((b: any) => { return { text: b.email, value: b.id } })];
      return options;
   }

   return [];
}