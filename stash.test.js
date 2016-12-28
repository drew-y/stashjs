/* global test, expect */
const Stash = require('./dist/Cash');

const products = new Stash();

products.insert({ name: "avacado", price: 3, qty: 43, priceSchedule: {
  monday: 1,
  tuesday: 8,
  friday: 9
}});
products.insert({ name: "pear", price: 1, qty: 32, priceSchedule: {
  monday: 4,
  tuesday: 6,
  friday: 1
}});

function insertDocs(amount) {
  function generateName() {
    return Math.floor(Math.random() * 100000 + 7).toString(36);
  }

  function generateQty() {
    return Math.floor(Math.random * 1000);
  }

  function generatePrice() {
    return Math.floor(Math.random * 10);
  }

  for (let index = 0; index < amount; index++) {
    products.insert({ name: generateName(), price: generatePrice(), qty: generateQty(), priceSchedule: {
      monday: generatePrice(),
      tuesday: generatePrice(),
      friday: generatePrice()
    }});
  }
}

insertDocs(2000);

products.insert({ name: "banana", price: 1, qty: 32, priceSchedule: {
  monday: 3,
  tuesday: 2,
  friday: 1
}});

test('Can insert a document', () => {
    return products.insert({ name: "apple", price: 0.5, qty: 322, priceSchedule: {
        monday: 0.3,
        tuesday: 0.4,
        friday: 0.2
    }}).then(result => expect(result.success).toBe(true));
});

test('Can find a the correct document with a string field', () => {
    const doc = products.findOne({ name: "banana" });
    expect(doc.name).toBe("banana");
});

test('Finds multiple docs with matching field values', () => {
    const docs = products.find({ price: 1 });
    expect(docs.count).toBe(2);
});

test('Can find all docs with a value in a subdocument', () => {
    const docs = products.find({ "priceSchedule.friday": 1 });
    expect(docs.count).toBe(2);
});

test('Can update a value', () => {
    return products.update({ name: "pear" }, { $set: { qty: 7 } })
        .then(() => {
            const pear = products.findOne({ name: "pear" });
            expect(pear.qty).toBe(7);
        });
});