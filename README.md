to run tests in the upper level, run npm install mocha

in packages.json:
{
  "scripts": {
    "test": "mocha"
  }
}


npm run test

to run code coverage in the upper level, run npm install c8

{
  "scripts": {
    "test": "c8 --reporter=text mocha"
  }
}





