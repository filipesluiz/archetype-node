import { NestMiddleware, Injectable } from "@nestjs/common";
import * as cuid from 'cuid';

@Injectable()
export class UIDMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
        req.id = cuid();
        next();
    }
}