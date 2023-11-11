import { Errors, Logger, Utils } from 'common';
import { Service } from 'typedi';
import config from '../Config';
const FormData = require('form-data');
import fetch, { Response } from 'node-fetch';

@Service()
export default class ContentModerationService {
  public async ImageModeration(request: any, transactionId: string | number) {
    const invalidParams = new Errors.InvalidParameterError();
    Utils.validate(request.imageData, 'imageData').setRequire().throwValid(invalidParams);
    Utils.validate(request.filename, 'filename').throwValid(invalidParams);
    invalidParams.throwErr();

    const form = new FormData();
    form.append('api_user', config.sightengineApiUser);
    form.append('api_secret', config.sightengineApiSecret);
    form.append('media', request.imageData, { filename: request.filename });
    form.append('workflow', config.sightengineWorkflowId);
    const startTime: [number, number] = process.hrtime();
    const response: Response = await fetch(config.sightengineWorkflowApiUrl, {
      method: 'POST',
      body: form,
    });
    const diff: [number, number] = process.hrtime(startTime);
    Logger.warn(transactionId, `took ${diff[0]}.${diff[1]} seconds`, response.status);
    if (response.status === 200) {
      const res = await this.logResponseAndReturnJson(response, `${transactionId}`);
      if (res.summary && res.summary.action === 'reject') {
        throw new Errors.GeneralError('content_is_not_allowed');
      }
      return {};
    } else {
      await this.logResponse(response, `${transactionId}`);
      return this.handleError(response);
    }
  }

  public async TextModeration(request: any, transactionId: string | number) {
    const invalidParams = new Errors.InvalidParameterError();
    Utils.validate(request.text, 'text').setRequire().throwValid(invalidParams);
    Utils.validate(request.mode, 'mode').setRequire().throwValid(invalidParams);
    invalidParams.throwErr();

    const form = new FormData();
    form.append('api_user', config.sightengineApiUser);
    form.append('api_secret', config.sightengineApiSecret);
    form.append('text', request.text);
    form.append('lang', 'en,fr,es,pt,ru');
    form.append('mode', request.mode);
    const startTime: [number, number] = process.hrtime();
    const response: Response = await fetch(config.sightengineTextApiUrl, {
      method: 'POST',
      body: form,
    });
    const diff: [number, number] = process.hrtime(startTime);
    Logger.warn(transactionId, `took ${diff[0]}.${diff[1]} seconds`, response.status);
    if (response.status === 200) {
      const res = await this.logResponseAndReturnJson(response, `${transactionId}`);
      if (
        res.moderation_classes &&
        (res.moderation_classes.sexual > 0.7 ||
          res.moderation_classes.discriminatory > 0.7 ||
          res.moderation_classes.toxic > 0.7)
      ) {
        throw new Errors.GeneralError('content_is_not_allowed');
      }
      return {};
    } else {
      await this.logResponse(response, `${transactionId}`);
      return this.handleError(response);
    }
  }

  private async logResponseAndReturnJson(response: Response, msgId: string) {
    let resStr: string = null;
    try {
      resStr = await response.text();
    } catch (e) {
      Logger.error(msgId, 'cannot read body response');
      throw new Errors.GeneralError();
    }
    Logger.info(msgId, 'response', resStr);
    return JSON.parse(resStr);
  }

  private async logResponse(response: Response, msgId: string) {
    let resStr: string = null;
    try {
      resStr = await response.text();
    } catch (e) {
      Logger.error(msgId, 'cannot read body response');
      throw new Errors.GeneralError();
    }
    Logger.info(msgId, 'response', resStr);
    return;
  }

  private async handleError(response: Response) {
    throw new Errors.GeneralError();
  }
}
