const env = process.env.NODE_ENV;

export const LOCAL = 'LOCAL';
export const QA = 'QA';
export const HML = 'HML';
export const PRD = 'PRD';

export function isLocal(): boolean {
    return env == null || env === LOCAL;
}

export function isQA(): boolean {
    return env === QA;
}

export function isHml(): boolean {
    return env === HML;
}

export function isPrd() {
    return env === PRD;
}
