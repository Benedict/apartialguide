Feature: Live departures

  At a bus or tram stop the reader hears what is due, from TfL, as they arrive. The stop comes
  from the map; the times come live. Stops, lines and places here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And the reader starts part way along Long Street

  Scenario: A bus stop in view, with what is due there
    Given a bus stop called "Invented Corner" with the code "490000000X" right beside the reader
    And TfL says the 410 to Invented Palace is due at "490000000X" in 3 minutes
    When the game begins
    Then the reader can hear departures from "Invented Corner"
    And the departures say "Invented Corner: the 410 to Invented Palace in 3 minutes."

  Scenario: A tram stop, found at TfL by its name
    Given a tram stop called "Inventon" right beside the reader
    When the game begins
    Then the reader can hear departures from "Inventon"

  Scenario: Without an answer from TfL, nothing is said
    Given a bus stop called "Invented Corner" with the code "490000000X" right beside the reader
    When the game begins
    Then the departures say nothing
