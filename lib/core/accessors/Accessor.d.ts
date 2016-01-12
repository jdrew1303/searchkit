import { ImmutableQuery } from "../query/ImmutableQuery";
import { Searcher } from "../Searcher";
export declare class Accessor {
    searcher: Searcher;
    uuid: string;
    constructor();
    setSearcher(searcher: any): void;
    translate(key: any): any;
    getResults(): any;
    onNewResults(): void;
    getAggregations(path: any, defaultValue: any): any;
    buildSharedQuery(query: ImmutableQuery): ImmutableQuery;
    buildOwnQuery(query: ImmutableQuery): ImmutableQuery;
}
