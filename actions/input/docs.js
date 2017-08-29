const _ = require('lodash');
const acquit = require('acquit');
const fs = require('fs');

const content = fs.readFileSync('index.test.js').toString();
const blocks = acquit.parse(content);

const formatString = (string) => _
  .chain(string)
  .trim()
  .split("\n")
  .map(s => s.substring(2))
  .join("\n");

const result = _
  .chain(blocks)
  .filter({ type: 'describe' })
  .reduce((acc, block) => {
    let doc = [`# ${block.contents}`];

    if (_.size(block.comments) > 0) {
      doc = _.concat(doc, formatString(block.comments[0]));
    }

    doc = _.concat(doc, _
      .chain(block.blocks)
      .filter({ type: 'it' })
      .map(it => {
        let itdoc = [`# ${it.contents}`];

        if (_.size(it.comments) > 0) {
          itdoc = _.concat(itdoc, formatString(block.comments[0]));
        }

        return _.join(itdoc, "\n\n");
      })
      .value());

    return _.concat(acc, _.join(doc, "\n\n"));
  }, [])
  .join("\n\n")
  .value();

console.log(result);