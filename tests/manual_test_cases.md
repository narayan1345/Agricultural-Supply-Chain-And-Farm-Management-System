# AgriTrack Manual Test Cases

| ID | Test | Steps | Expected result |
|---|---|---|---|
| TC01 | Admin login | Sign in with admin demo credentials | Admin dashboard opens |
| TC02 | Farmer login | Sign in as farmer | Farmer can access own farm/crop/harvest records |
| TC03 | Distributor login | Sign in as distributor | Distributor can browse inventory and own orders |
| TC04 | Invalid login | Enter incorrect password | 401 error; session not created |
| TC05 | Create farm | Sign in as farmer and add a farm | Farm row is inserted with current user as owner |
| TC06 | Farm ownership | Attempt to create crop under another farmer's farm | API rejects with forbidden response |
| TC07 | Create crop | Add crop to an owned farm | Crop row appears in crop list |
| TC08 | Create harvest | Add harvest for crop belonging to farm | Harvest row is inserted |
| TC09 | Invalid harvest relationship | Insert harvest where crop belongs to a different farm | Database trigger rejects the insert |
| TC10 | Inventory view | Open Inventory | Crop, warehouse and available quantity are displayed |
| TC11 | Create order | Distributor orders less than available stock | Order and delivery are created; stock decreases |
| TC12 | Oversell protection | Attempt order greater than available stock | Procedure rejects; transaction rolls back |
| TC13 | Role enforcement | Non-distributor attempts to create order | API and database trigger reject the operation |
| TC14 | MongoDB RUD | Run `npm run mongo:demo` | Document is inserted, read, updated and deleted |
| TC15 | Activity logs | Configure MongoDB and open Activity Logs | Latest activity documents appear |
