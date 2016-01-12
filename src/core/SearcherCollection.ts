import {Searcher} from  "./Searcher"
import {StatefulAccessor} from  "./accessors/StatefulAccessor"

import * as _ from "lodash"

export class SearcherCollection {

  constructor(public searchers:Array<Searcher> = []) {

  }

  getAccessors(){
    return _.chain(this.searchers)
      .pluck("accessors")
      .flatten()
      .value()
  }

  getStatefulAccessors(){
    return _.filter(this.getAccessors(), (accessor)=> {
      return accessor instanceof StatefulAccessor
    })
  }

  add(searcher){
    this.searchers.push(searcher)
    return searcher
  }

  size(){
    return this.searchers.length
  }

  getState(){
    return _.reduce(this.getStatefulAccessors(), (state, accessor)=> {
      return _.extend(state, accessor.getQueryObject())
    }, {})
  }

  setAccessorStates(query){
    _.each(
      this.getStatefulAccessors(),
      accessor=>accessor.fromQueryObject(query)
    )
  }

  notifyStateChange(oldState){
    _.each(
      this.getStatefulAccessors(),
      accessor => accessor.onStateChange(oldState)
    )
  }

  getChangedSearchers(){
    return new SearcherCollection(
      _.filter(this.searchers, {queryHasChanged:true})
    )
  }

  buildSharedQuery(query){
    return _.reduce(this.getAccessors(), (query, accessor)=>{
      return accessor.buildSharedQuery(query)
    }, query)
  }

  buildQuery(query){
    _.each(this.searchers, searcher => searcher.buildQuery(query))
  }

  getQueries(){
    return _.map(this.searchers, (searcher)=> {
      return searcher.query.getJSON()
    })
  }

  setResponses(responses){
    _.each(responses, (results, index)=>{
      this.searchers[index].setResults(results)
    })
  }

  setError(error){
    _.each(this.searchers, searcher => searcher.setError(error))
  }

  resetState(){
    _.each(this.searchers, searcher => searcher.resetState())
  }


}
