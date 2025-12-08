package com.example.AnimAI.repository;

import com.example.aipet.domain.Egg;
import com.example.aipet.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EggRepository extends JpaRepository<Egg, Long> {
    Optional<Egg> findByOwnerAndHatchedIsFalse(User owner);
}
