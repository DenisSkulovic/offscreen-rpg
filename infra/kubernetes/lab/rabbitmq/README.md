# RabbitMQ lab

Disposable broker for the kind cluster created by `../up.sh`. This is not the game and not Compose.

`install.sh` applies pinned cert-manager v1.21.3 (webhook certificates for the operator manifest), RabbitMQ cluster operator v2.23.3, and one `RabbitmqCluster` named `lab-broker` in namespace `messaging`. `smoke.sh` publishes, acks, and crashes a consumer. Neither script creates or deletes the cluster.

The broker password is generated at install time into Secret `lab-broker-user`. It is not in Git. The client username is `lab-client`.
