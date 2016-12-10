import { Cash } from "../Cash";

window["Cash"] = Cash;

const people = new Cash();

people.insert({ name: "Drew", info: { age: 21, sex: "male"} });
people.insert({ name: "Alex", info: { age: 19, sex: "male"} });
people.insert({ name: "Abbe", info: { age: 16, sex: "female"} });

window["people"] = people;