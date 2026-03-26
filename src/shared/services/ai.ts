import {
 AIManager,
 FalProvider,
 GeminiProvider,
 KieProvider,
 PolloProvider,
 ReplicateProvider,
} from '@/extensions/ai';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get ai manager with configs
 */
export function getAIManagerWithConfigs(configs: Configs) {
 const aiManager = new AIManager();

 if (configs.kie_api_key) {
 aiManager.addProvider(
 new KieProvider({
 apiKey: configs.kie_api_key,
 customStorage: configs.kie_custom_storage === 'true',
 })
 );
 }

 if (configs.pollo_api_key) {
 aiManager.addProvider(
 new PolloProvider({
 apiKey: configs.pollo_api_key,
 baseUrl: configs.pollo_base_url,
 customStorage: configs.pollo_custom_storage === 'true',
 })
 );
 }

 if (configs.replicate_api_token) {
 aiManager.addProvider(
 new ReplicateProvider({
 apiToken: configs.replicate_api_token,
 customStorage: configs.replicate_custom_storage === 'true',
 })
 );
 }

 if (configs.fal_api_key) {
 aiManager.addProvider(
 new FalProvider({
 apiKey: configs.fal_api_key,
 customStorage: configs.fal_custom_storage === 'true',
 })
 );
 }

 if (configs.gemini_api_key) {
 aiManager.addProvider(
 new GeminiProvider({
 apiKey: configs.gemini_api_key,
 })
 );
 }

 return aiManager;
}

/**
 * global ai service
 */
let aiService: AIManager | null = null;

/**
 * get ai service manager
 */
export async function getAIService(configs?: Configs): Promise<AIManager> {
 if (!configs) {
 configs = await getAllConfigs();
 }
 aiService = getAIManagerWithConfigs(configs);

 return aiService;
}
