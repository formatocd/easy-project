use crate::models::{dependency::Dependency, task::Task};
use petgraph::algo::{is_cyclic_directed, toposort};
use petgraph::graphmap::DiGraphMap;
use std::collections::HashSet;

pub struct DependencyGraph;

impl DependencyGraph {
    pub fn build_graph(
        tasks: &[Task],
        dependencies: &[Dependency],
    ) -> DiGraphMap<i64, ()> {
        let mut graph = DiGraphMap::new();

        for task in tasks {
            graph.add_node(task.id);
        }

        let task_ids: HashSet<i64> = tasks.iter().map(|t| t.id).collect();

        for dep in dependencies {
            if task_ids.contains(&dep.predecessor_id) && task_ids.contains(&dep.successor_id) {
                // Direction: predecessor -> successor
                graph.add_edge(dep.predecessor_id, dep.successor_id, ());
            }
        }

        graph
    }

    /// Checks if the dependency graph contains any cycles
    pub fn has_cycle(tasks: &[Task], dependencies: &[Dependency]) -> bool {
        let graph = Self::build_graph(tasks, dependencies);
        is_cyclic_directed(&graph)
    }

    /// Tests if adding a new prospective dependency would create a cycle
    pub fn would_create_cycle(
        tasks: &[Task],
        dependencies: &[Dependency],
        candidate_pred_id: i64,
        candidate_succ_id: i64,
    ) -> bool {
        if candidate_pred_id == candidate_succ_id {
            return true;
        }

        let mut graph = Self::build_graph(tasks, dependencies);
        graph.add_edge(candidate_pred_id, candidate_succ_id, ());
        is_cyclic_directed(&graph)
    }

    /// Returns tasks in topological order (predecessors before successors)
    pub fn topological_order(
        tasks: &[Task],
        dependencies: &[Dependency],
    ) -> Result<Vec<i64>, String> {
        let graph = Self::build_graph(tasks, dependencies);
        match toposort(&graph, None) {
            Ok(order) => Ok(order),
            Err(_) => Err("Se ha detectado una dependencia circular en el proyecto.".to_string()),
        }
    }
}
