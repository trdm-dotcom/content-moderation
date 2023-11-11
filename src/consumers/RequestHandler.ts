import { Inject, Service } from 'typedi';
import ContentModerationService from '../services/ContentModerationService';
import { Kafka } from 'kafka-common';
import { getInstance } from '../services/KafkaProducerService';
import config from '../Config';
import { MessageSetEntry } from 'kafka-common/build/src/modules/kafka';
import { Errors, Logger } from 'common';
import { UriNotFound } from 'common/build/src/modules/errors';

@Service()
export default class RequestHandler {
  @Inject()
  private contentModerationService: ContentModerationService;

  public init() {
    const handle: Kafka.KafkaRequestHandler = new Kafka.KafkaRequestHandler(getInstance());
    new Kafka.KafkaConsumer(config).startConsumer([config.clusterId], (message: MessageSetEntry) =>
      handle.handle(message, this.handleRequest)
    );
  }

  private handleRequest: Kafka.Handle = async (message: Kafka.IMessage) =>  {
    Logger.info(`Endpoint received message: ${JSON.stringify(message)}`);
    if (message == null || message.data == null) {
      return Promise.reject(new Errors.SystemError());
    } else {
      switch (message.uri) {
        case 'post:/api/v1/moderation/image':
          return this.contentModerationService.ImageModeration(message.data, message.transactionId);

        case 'post:/api/v1/moderation/text':
          return this.contentModerationService.TextModeration(message.data, message.transactionId);

        default:
          throw new UriNotFound();
      }
    }
  };
}
