import { adminApi } from "./client";
import type {
  EmailTemplate,
  PreviewEmailTemplatePayload,
  PreviewEmailTemplateResponse,
  SendTestEmailPayload,
  SendTestEmailResponse,
} from "../types/admin";

export interface ListEmailTemplatesResponse {
  templates: EmailTemplate[];
}

export const listEmailTemplates = () =>
  adminApi
    .get<ListEmailTemplatesResponse>("/v1/admin/email-templates")
    .then((r) => r.data.templates ?? []);

export const getEmailTemplate = (templateKey: string, locale?: string) =>
  adminApi
    .get<EmailTemplate>(`/v1/admin/email-templates/${encodeURIComponent(templateKey)}`, {
      params: locale ? { locale } : undefined,
    })
    .then((r) => r.data);

export interface UpdateEmailTemplatePayload {
  locale?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
}

export const updateEmailTemplate = (
  templateKey: string,
  body: UpdateEmailTemplatePayload,
) =>
  adminApi
    .put<EmailTemplate>(
      `/v1/admin/email-templates/${encodeURIComponent(templateKey)}`,
      body,
    )
    .then((r) => r.data);

export const previewEmailTemplate = (
  templateKey: string,
  body: PreviewEmailTemplatePayload,
) =>
  adminApi
    .post<PreviewEmailTemplateResponse>(
      `/v1/admin/email-templates/${encodeURIComponent(templateKey)}:preview`,
      body,
    )
    .then((r) => r.data);

export const sendTestEmail = (
  templateKey: string,
  body: SendTestEmailPayload,
) =>
  adminApi
    .post<SendTestEmailResponse>(
      `/v1/admin/email-templates/${encodeURIComponent(templateKey)}:test`,
      body,
    )
    .then((r) => r.data);
