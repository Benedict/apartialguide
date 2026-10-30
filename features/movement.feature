Feature: Moving through Addiscombe

  Movement is tested against the street graph, independent of narration.

  Scenario: Only real exits are offered
    Given the reader is at a junction where streets leave to the north-east, south, and west
    When the reader is offered directions
    Then the choices are north-east, south, and west
    And north is not offered

  Scenario: Exits are named by the nearest compass point
    Given a street leaves a junction on a bearing of 58 degrees
    When the reader is offered directions
    Then that exit is labelled north-east

  Scenario: Close exits are told apart
    Given streets leave a junction on bearings of 30 and 55 degrees
    When the reader is offered directions
    Then the choices are north-north-east and north-east

  Scenario: Long streets become a corridor of stops
    Given a street runs 400 metres between two junctions
    When the reader walks along it
    Then it is divided into stops about 150 metres apart
    And each stop between the junctions offers only the two directions along the street

  Scenario: Driveways, parking aisles, pavements and crossings make no stop
    Given a street runs 230 metres between two junctions
    And a driveway, a parking aisle, a pavement and a crossing leave it part way along
    When the reader walks along it
    Then it is divided into stops about 115 metres apart

  Scenario: Pavements and a crossing that alone join two streets are kept as a way to go
    Given a main road no one walks along, with a street leaving it north and another leaving it south
    And the only way between them is along a pavement and over a crossing
    When the reader walks from the north street
    Then the south street can be reached

  Scenario: A short way that leads nowhere makes no stop
    Given a street runs 230 metres between two junctions
    And an unnamed way 20 metres long leaves it part way along and ends
    When the reader walks along it
    Then it is divided into stops about 115 metres apart

  Scenario: An unnamed service road that leads nowhere makes no stop, however long
    Given a street runs 230 metres between two junctions
    And an unnamed service road 70 metres long leaves it part way along and ends
    When the reader walks along it
    Then it is divided into stops about 115 metres apart

  Scenario: An unnamed footpath that leads somewhere is a way to go
    Given a street runs 230 metres between two junctions
    And an unnamed footpath 70 metres long leaves it part way along and ends
    When the reader walks along it
    Then the footpath is a way to go from the street

  Scenario: A street drawn in pieces is walked as one
    Given a street called "Long Street" runs 120 metres, drawn as three ways
    When the reader walks along it
    Then there is no stop between its ends

  Scenario: Where a street changes its name is a place
    Given a street runs 120 metres east, called "Long Street" and then "Short Row"
    When the reader walks along it
    Then there is a stop where "Long Street" becomes "Short Row"

  Scenario: A named place along a long street has a stop beside it
    Given a street runs 400 metres between two junctions
    And a pub called "The Sextant" stands beside it 200 metres along
    When the reader walks along it
    Then a stop is within 15 metres of the street's nearest point to "The Sextant"
    And no two stops along it are more than 150 metres apart

  Scenario: Named places close together share a stop
    Given a street runs 400 metres between two junctions
    And a pub called "The Sextant" stands beside it 190 metres along
    And a shop called "The Compass" stands beside it 210 metres along
    When the reader walks along it
    Then one stop lies between "The Sextant" and "The Compass"

  Scenario: A junction drawn as several close nodes is one place
    Given a main street runs east to west, with a side street leaving north and another south 8 metres further east
    When the reader is offered directions
    Then the choices are north, east, south, and west

  Scenario: Stops snap to junctions
    Given a junction lies within 150 metres of the previous stop
    When the next stop is placed
    Then the junction is that stop

  Scenario: Empty stops are kept
    Given a stop on Everton Road with only highway tags in reach
    When the reader arrives
    Then the stop exists
    And the narration draws on nothing beyond reach to fill it
