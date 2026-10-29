Feature: Beyond the map, as hearsay

  What others keep beyond the map's edge, such as a Roman road, is never in a room. Guide tells it
  only when the reader looks beyond, as hearsay, by its name and kind as kept, and how far away.
  Streets and roads here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And the reader starts part way along Long Street

  Scenario: Looking beyond the map
    Given a road called "Invented Way to Nowhere?" is kept 2 km west of the reader, beyond the map
    When the reader types "look beyond"
    Then it says, as hearsay, "beyond what the map shows, “Invented Way to Nowhere?”, a road, 2 km to the west."

  Scenario: Nothing kept near enough
    Given a road called "Invented Way to Nowhere?" is kept 20 km west of the reader, beyond the map
    When the reader types "look beyond"
    Then it says "Beyond the map there may be more. I could not say what."
