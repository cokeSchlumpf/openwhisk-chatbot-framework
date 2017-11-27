const { fromJS } = require('immutable');
const _ = require('lodash');

const initialState = {
  calls: [],
  wait: Promise.resolve()
}

let state = {};

module.exports = (parameters) => {
  const action$invoke = ({ name, blocking, result, params }) => {
    state = state.updateIn(['calls'], calls => {
      return calls.push(fromJS({
        action: {
          name,
          blocking,
          result,
          params
        }
      }));
    });

    const call_index = _.size(state.toJS().calls) - 1;

    try {
      const action = require(`../actions/${name.split('/')[1]}`);
      const action_result = Promise.resolve(action.main(_.assign({}, parameters, fromJS(params).toJS()))).then(result => {
        state = state.updateIn(['calls', call_index], call => {
          return call.setIn(['result'], result);
        });

        return result;
      });

      if (!blocking) {
        return action_result.then(() => {})
      } else {
        return action_result;
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
      }

      return Promise.reject({
        statusCode: 500,
        error: {
          message: `openwhisk-mock: error calling action ${name}.`,
          parameters: {
            input: {
              name,
              blocking,
              result,
              params
            },
            error: error
          }
        }
      }).then(result => {
        state = state.updateIn(['calls', call_index], call => {
          return call.setIn(['result'], result);
        });

        return result;
      });
    }
  }

  const mock$calls = () => {
    return state.toJS().calls;
  }

  const mock$reset = () => {
    state = fromJS(initialState);
  }

  mock$reset();

  return () => {
    return {
      _mock: {
        calls: mock$calls,
        reset: mock$reset
      },
      actions: {
        invoke: action$invoke
      }
    }
  }
};