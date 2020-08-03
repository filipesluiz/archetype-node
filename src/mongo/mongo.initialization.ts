import { MongooseModule } from '@nestjs/mongoose';
import { isLocal } from '../environment/env.initialization';

export function initMongo() {
    return MongooseModule.forRootAsync({
        useFactory: async () => {
            const username = process.env.MONGO_USER_NAME;
            const password = process.env.MONGO_PASSWORD;
            const host = process.env.MONGO_HOST;
            const port = process.env.MONGO_PORT || 27017;
            const dbname = process.env.MONGO_DB_NAME || 'fibra';

            const uri = isLocal()
                ? getLocalUri({ dbname, port })
                : getDefaultUri({ username, password, host, port, dbname });

            return { uri };
        },
    });
}

function getLocalUri({ dbname, port }) {
    return `mongodb://localhost:${port}/${dbname}`;
}

function getDefaultUri({ username, password, host, port, dbname }) {
    // TODO adicionar replicas set e etc...
    return `mongodb://${username}:${password}@${host}:${port}/${dbname}`;
}
