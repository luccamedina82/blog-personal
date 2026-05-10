alter table cards
  drop constraint if exists cards_source_kind_check;

alter table cards
  add constraint cards_source_kind_check
    check (source_kind in ('evaluator','devlab','bitacora','book','faculty'));
