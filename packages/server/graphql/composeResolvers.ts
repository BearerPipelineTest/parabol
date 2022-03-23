/*
  GraphQL Shield has a great API but it uses graphql-middleware, which is horrendously slow.
  This is because the middleware wraps every single field. yikes!
  It also does typechecks in runtime that we can do at build time

  resolver-composition uses a barebones middleware, but the API is lacking (e.g. no caching, uses dot-separated strings for fields)
  So, I kept the Shield API for rules, but I don't run it through graphql-middleware
  Unfortunately, it still requires graphql-middleware, which is why it's a dependency

  This file accepts resolvers and permissions and applies permissions as higher order functions to those resolvers
*/
import {GraphQLScalarType} from 'graphql'
import {allow} from 'graphql-shield'
import type {ShieldRule} from 'graphql-shield/dist/types'
import hash from 'object-hash'
import {Resolver as R, ResolverFn} from './private/resolverTypes'
import {SubscriptionResolvers} from './public/resolverTypes'

type Resolver = ResolverFn<any, any, any, any>

const options = {
  allowExternalErrors: false,
  debug: false,
  fallbackRule: allow,
  fallbackError: () => new Error(''),
  hashFunction: hash
}

const wrapResolve =
  (resolve: Resolver, rule: ShieldRule): Resolver =>
  async (source, args, context, info) => {
    if (!context.shield) {
      context.shield = {
        cache: {}
      }
    }
    try {
      const res = await rule.resolve(source, args, context, info, options)
      if (res === true) {
        return await resolve(source, args, context, info)
      } else if (res === false) {
        return new Error('Not authorized')
      } else {
        throw new Error('Error in shield rule')
      }
    } catch (err) {
      throw err
    }
  }

type ResolverMap = {
  // Subscription: SubscriptionResolvers
  [TypeName: string]:
    | {
        [FieldName: string]: R<any, any, any, any>
      }
    | GraphQLScalarType
    | SubscriptionResolvers
}

interface PermissionMap {
  [TypeName: string]: {
    [FieldName: string]: ShieldRule
  }
}

const composeResolvers = (resolverMap: ResolverMap, permissionMap: PermissionMap) => {
  Object.entries(permissionMap).forEach(([typeName, ruleFieldMap]) => {
    const resolverSubMap = resolverMap[typeName as keyof typeof resolverMap]
    if (!resolverSubMap) throw new Error(`No resolver exists for type: ${typeName}`)
    Object.entries(ruleFieldMap).forEach(([fieldName, rule]) => {
      if (fieldName === '*') {
        // apply this rule to every member of the resolverSubMap
        // Note: Permissions don't get applied to fields that don't have custom resolvers!
        // If this becomes a problem, we'll need to use the schema to get the typeMaps
        Object.entries(resolverSubMap).forEach(([resolverFieldName, resolve]) => {
          // the wildcard is just a default value. if the field has a specific rule, use that
          if (ruleFieldMap[resolverFieldName]) return
          resolverSubMap[resolverFieldName] = wrapResolve(resolve, rule)
        })
      } else {
        const unwrappedResolver = resolverSubMap[fieldName]
        if (!unwrappedResolver) {
          throw new Error(`No resolver exists for field: ${fieldName}`)
        }
        resolverSubMap[fieldName] = wrapResolve(unwrappedResolver, rule)
      }
    })
  })
  return resolverMap
}

export default composeResolvers
