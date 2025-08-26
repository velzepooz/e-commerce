export const getEnvFilePath = (serviceName: string): string => {
  const isTest = process.env.NODE_ENV === 'test';
  const envFileName = isTest ? '.test.env' : '.env';

  return `apps/${serviceName}/${envFileName}`;
};

export const getConfigModuleOptions = (serviceName: string) => {
  return {
    isGlobal: true,
    envFilePath: getEnvFilePath(serviceName),
  };
};
