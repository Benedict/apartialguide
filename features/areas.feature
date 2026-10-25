Feature: Wards, by another account

  The map does not say where one ward ends and the next begins; the ONS boundaries do.
  Guide tells of a step that crosses one, and never gives the boundary as the map's.
  Streets and wards here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And the reader starts part way along Long Street

  Scenario: A step from one ward into another
    Given a ward called "Inventa West" west of just beyond the reader, and "Inventa East" east of it
    When the reader types "east"
    Then it says "By another account, you have left Inventa West for Inventa East."

  Scenario: A step out of every ward the boundaries know
    Given a ward called "Inventa West" west of just beyond the reader, and none east of it
    When the reader types "east"
    Then it says "By another account, you have left Inventa West."

  Scenario: A step within one ward says nothing of wards
    Given a ward called "Inventa West" all along Long Street
    When the reader types "east"
    Then it does not say "By another account, you have left"

  Scenario: The tour begins by saying which ward it is in
    Given a ward called "Inventa West" all along Long Street
    When the reader takes the tour from part way along Long Street
    Then it says "By another account, you are in Inventa West, a ward."
