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
    Given a street runs 230 metres between two junctions
    When the reader walks along it
    Then it is divided into stops about 50 metres apart
    And each stop between the junctions offers only the two directions along the street

  Scenario: Stops snap to junctions
    Given a junction lies within 50 metres of the previous stop
    When the next stop is placed
    Then the junction is that stop

  Scenario: Empty stops are kept
    Given a stop on Everton Road with only highway tags in reach
    When the reader arrives
    Then the stop exists
    And the narration draws on nothing beyond reach to fill it
