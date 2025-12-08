package com.example.animai.repository;

import com.example.animai.domain.Egg;
import com.example.animai.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EggRepository extends JpaRepository<Egg, Long> {
    Optional<Egg> findByOwnerAndHatchedIsFalse(User owner);
}
