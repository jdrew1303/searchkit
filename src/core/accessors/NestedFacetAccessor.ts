import {LevelState} from "../state"
import {StatefulAccessor} from "./StatefulAccessor"
import {
  TermQuery, TermsBucket, FilterBucket,
  BoolShould, BoolMust, NestedQuery,
  NestedBucket, MinMetric
} from "../query";

export interface NestedFacetAccessorOptions {
	field:string
	id:string
	title:string
  orderKey?:string
  orderDirection?:string
  startLevel?:number
}

export class NestedFacetAccessor extends StatefulAccessor<LevelState> {
	state = new LevelState()
	options:any

	constructor(key, options:NestedFacetAccessorOptions){
		super(key, options.id)
		this.options = options
	}

	getBuckets(level) {
    return this.getAggregations(
      [this.key, "children", "lvl"+level, "children", "buckets"],
      []
    )
	}

	buildSharedQuery(query) {

		let levelFilters = this.state.getValue()
		let lastIndex = levelFilters.length - 1
		var filterTerms = _.map(levelFilters, (filter,i) => {
			let value = filter[0]
			let isLeaf = i === lastIndex
			let subField = isLeaf ? ".value" : ".ancestors"
			return TermQuery(this.options.field + subField, value)
		})

		if(filterTerms.length > 0){
      let leafFilter = _.get(levelFilters, [levelFilters.length - 1, 0], "")
      let parentOfleaf = _.get(
        levelFilters,
        [levelFilters.length - 2, 0],
        this.options.title || this.key
      )
      let selectedFilter = {
        id:this.key,
        name:this.translate(parentOfleaf),
        value:leafFilter,
        remove:()=> {
          this.state = this.state.clear(levelFilters.length-1)
        }
      }

      query = query.addFilter(this.uuid,
				NestedQuery(this.options.field, BoolMust(filterTerms))
      ).addSelectedFilter(selectedFilter)

    }

    return query
  }

  getTermAggs(){
    let subAggs = undefined
    let orderMetric = undefined
    if(this.options.orderKey){
      let orderDirection = this.options.orderDirection || "asc"
      let orderKey = this.options.orderKey
      if(_.includes(["_count", "_term"], orderKey)) {
        orderMetric = {[orderKey]:orderDirection}
      } else {
        if(_.startsWith(orderKey, this.options.field + ".")){
          const subAggName = this.options.field + "_order"
          orderMetric = {
            [subAggName]:orderDirection
          }
          subAggs = MinMetric(subAggName, orderKey)
        }
      }
    }
    let valueField = this.options.field+".value"

    return TermsBucket(
      "children", valueField,
      {size:0, order:orderMetric},
      subAggs
    )

  }

  buildOwnQuery(query){

    let aggs = {}
    let levelField = this.options.field+".level"
    let ancestorsField = this.options.field+".ancestors"
    let startLevel = this.options.startLevel || 1
    let termAggs = this.getTermAggs()
    let lvlAggs = []
    var addLevel = (level, ancestors=[]) => {
      lvlAggs.push(
        FilterBucket(
          "lvl"+level,
          BoolMust([TermQuery(levelField, level+startLevel), ...ancestors]),
          termAggs
        )
      )
    }

    addLevel(0)

		let levels = this.state.getValue()

		_.each(levels, (level,i) => {

			let ancestors = _.map(_.take(levels, i+1), (level)=>{
				return TermQuery(ancestorsField, level[0])
			})

      addLevel(i+1, ancestors)

    })

    return query.setAggs(
      FilterBucket(
        this.key,
        query.getFiltersWithoutKeys(this.uuid),
        NestedBucket(
          "children",
          this.options.field,
          ...lvlAggs
        )
      )
    )

  }

}
