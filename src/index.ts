import 'reflect-metadata';
import config from './Config';
import { Container } from 'typedi';
import { Logger } from 'common';
import RequestHandler from './consumers/RequestHandler';
import { initKafka } from './services/KafkaProducerService';

Logger.create(config.logger.config, true);
Logger.info('Starting...');

async function run() {
  Logger.info('run service content-moderation');
  initKafka();
  Container.get(RequestHandler).init();
}

run().catch((error) => {
  Logger.error(error);
});
