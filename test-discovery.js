// Test script para verificar se os serviços funcionam
import { customCommandDiscoveryService } from './apps/web/app/services/custom-command-discovery.service.ts';

async function test() {
  try {
    console.log('Testando descoberta de comandos...');
    const commands = await customCommandDiscoveryService.discoverCommands('/home/ubuntu/projetos/webdev');
    console.log('Comandos encontrados:', commands);
  } catch (error) {
    console.error('Erro:', error);
  }
}

test();