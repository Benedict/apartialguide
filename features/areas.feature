Feature: Wards, as hearsay

  The map does not say where one ward ends and the next begins; the ONS boundaries do.
  Guide tells of a step that crosses one, and never gives the boundary as the map's.
  Streets and wards here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And the reader starts part way along Long Street

  Scenario: A step from one ward into another
    Given a ward called "Inventa West" west of just beyond the reader, and "Inventa East" east of it
    When the reader types "east"
    Then it says, as hearsay, "you have left Inventa West for Inventa East."

  Scenario: A step out of every ward the boundaries know
    Given a ward called "Inventa West" west of just beyond the reader, and none east of it
    When the reader types "east"
    Then it says, as hearsay, "you have left Inventa West."

  Scenario: A step within one ward says nothing of wards
    Given a ward called "Inventa West" all along Long Street
    When the reader types "east"
    Then it does not say "you have left"

  Scenario: The tour begins by saying which ward it is in
    Given a ward called "Inventa West" all along Long Street
    When the reader takes the tour from part way along Long Street
    Then it says, as hearsay, "you are in Inventa West, a ward."

  Scenario: A step into a zone drawn over the map
    Given a flood zone called "Inventa Zone" east of just beyond the reader
    When the reader types "east"
    Then it says, as hearsay, "you are within Inventa Zone, a flood zone."
